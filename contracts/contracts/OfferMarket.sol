// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.28;

import { FHE, euint64, ebool } from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import { InEuint64 } from "@fhenixprotocol/cofhe-contracts/ICofhe.sol";
import { InvoiceRegistry } from "./InvoiceRegistry.sol";

/**
 * @title OfferMarket
 * @dev Manages lender offer submissions and homomorphic rate comparisons.
 * Sensitive bid fields (interest rate and offer amount) are kept encrypted on-chain.
 */
contract OfferMarket {
    enum OfferStatus { Pending, Accepted, Rejected }

    struct Offer {
        uint256 id;
        uint256 invoiceId;
        euint64 rate;          // Encrypted discount/interest rate
        euint64 offerAmount;   // Encrypted offer funding amount
        address lender;
        OfferStatus status;
    }

    struct OfferMetadata {
        uint256 offerId;
        address lender;
    }

    InvoiceRegistry public immutable invoiceRegistry;
    uint256 private _nextOfferId;

    mapping(uint256 => Offer) private _offers;
    mapping(uint256 => uint256[]) private _invoiceOffers;
    mapping(uint256 => euint64) private _bestOffers;

    event OfferSubmitted(uint256 indexed offerId, uint256 indexed invoiceId, address indexed lender);
    event OfferAccepted(uint256 indexed offerId, uint256 indexed invoiceId);

    constructor(address _invoiceRegistry) {
        require(_invoiceRegistry != address(0), "OfferMarket: invalid registry address");
        invoiceRegistry = InvoiceRegistry(_invoiceRegistry);
        _nextOfferId = 1;
    }

    /**
     * @notice Submits a new private offer on a listed invoice.
     * @param invoiceId The target invoice ID
     * @param encryptedRate The FHE encrypted interest rate
     * @param encryptedOfferAmount The FHE encrypted funding amount
     * @return The plaintext offer ID assigned
     */
    function submitOffer(
        uint256 invoiceId,
        InEuint64 calldata encryptedRate,
        InEuint64 calldata encryptedOfferAmount
    ) external returns (uint256) {
        // Fetch metadata from registry and verify state
        ( , InvoiceRegistry.InvoiceStatus status, address merchant, ) = invoiceRegistry.getInvoiceMetadata(invoiceId);
        require(status == InvoiceRegistry.InvoiceStatus.Listed, "OfferMarket: invoice must be Listed");

        uint256 offerId = _nextOfferId++;

        // Verify FHE inputs
        euint64 rate = FHE.asEuint64(encryptedRate);
        euint64 offerAmount = FHE.asEuint64(encryptedOfferAmount);

        // Grant FHE permissions
        FHE.allowSender(rate);
        FHE.allowSender(offerAmount);

        FHE.allow(rate, merchant);
        FHE.allow(offerAmount, merchant);

        FHE.allowThis(rate);
        FHE.allowThis(offerAmount);

        _offers[offerId] = Offer({
            id: offerId,
            invoiceId: invoiceId,
            rate: rate,
            offerAmount: offerAmount,
            lender: msg.sender,
            status: OfferStatus.Pending
        });

        _invoiceOffers[invoiceId].push(offerId);

        emit OfferSubmitted(offerId, invoiceId, msg.sender);
        return offerId;
    }

    /**
     * @notice Performs homomorphic comparison on all offers to find the lowest rate.
     * @param invoiceId The ID of the target invoice
     * @return An encrypted euint64 representing the best offer ID
     */
    function compareOffers(uint256 invoiceId) external returns (euint64) {
        uint256[] storage offerIds = _invoiceOffers[invoiceId];
        require(offerIds.length > 0, "OfferMarket: no offers for this invoice");

        uint256 firstOfferId = offerIds[0];
        euint64 bestRate = _offers[firstOfferId].rate;
        euint64 bestOfferId = FHE.asEuint64(uint64(firstOfferId));

        for (uint256 i = 1; i < offerIds.length; i++) {
            uint256 currentOfferId = offerIds[i];
            euint64 currentRate = _offers[currentOfferId].rate;
            euint64 currentOfferIdEnc = FHE.asEuint64(uint64(currentOfferId));

            // Homomorphic comparison: is currentRate < bestRate?
            ebool isLess = FHE.lt(currentRate, bestRate);

            // Multiplex rates and IDs
            bestRate = FHE.select(isLess, currentRate, bestRate);
            bestOfferId = FHE.select(isLess, currentOfferIdEnc, bestOfferId);
        }

        // Allow the caller to decrypt the resulting best offer ID handle
        FHE.allowSender(bestOfferId);

        _bestOffers[invoiceId] = bestOfferId;

        return bestOfferId;
    }

    /**
     * @notice Returns the FHE encrypted best offer ID handle for an invoice.
     * @param invoiceId The ID of the invoice.
     */
    function getBestOffer(uint256 invoiceId) external view returns (euint64) {
        return _bestOffers[invoiceId];
    }

    /**
     * @notice Accepts a specific offer, rejecting all others and marking the invoice as Funded.
     * @param invoiceId The ID of the invoice
     * @param offerId The ID of the accepted offer
     */
    function acceptOffer(uint256 invoiceId, uint256 offerId) external {
        // Only the invoice's merchant can accept offers
        ( , , address merchant, ) = invoiceRegistry.getInvoiceMetadata(invoiceId);
        require(msg.sender == merchant, "OfferMarket: caller is not the merchant");

        Offer storage selectedOffer = _offers[offerId];
        require(selectedOffer.invoiceId == invoiceId, "OfferMarket: offer does not match invoice");
        require(selectedOffer.status == OfferStatus.Pending, "OfferMarket: offer is not pending");

        selectedOffer.status = OfferStatus.Accepted;

        // Reject other offers
        uint256[] storage offerIds = _invoiceOffers[invoiceId];
        for (uint256 i = 0; i < offerIds.length; i++) {
            uint256 currentId = offerIds[i];
            if (currentId != offerId) {
                _offers[currentId].status = OfferStatus.Rejected;
            }
        }

        // Update invoice status in the registry to Funded
        invoiceRegistry.updateStatus(invoiceId, InvoiceRegistry.InvoiceStatus.Funded);

        emit OfferAccepted(offerId, invoiceId);
    }

    /**
     * @notice Returns public metadata (ID and lender address) for all offers on an invoice.
     * @param invoiceId The ID of the invoice
     */
    function getOffersForInvoice(uint256 invoiceId) external view returns (OfferMetadata[] memory) {
        uint256[] storage offerIds = _invoiceOffers[invoiceId];
        OfferMetadata[] memory list = new OfferMetadata[](offerIds.length);
        for (uint256 i = 0; i < offerIds.length; i++) {
            uint256 id = offerIds[i];
            list[i] = OfferMetadata({
                offerId: id,
                lender: _offers[id].lender
            });
        }
        return list;
    }

    /**
     * @notice Returns the status of a specific offer.
     * @param offerId The ID of the offer.
     */
    function getOfferStatus(uint256 offerId) external view returns (OfferStatus) {
        return _offers[offerId].status;
    }
}
