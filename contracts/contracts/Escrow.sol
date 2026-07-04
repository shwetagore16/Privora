// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.28;

import { InvoiceRegistry } from "./InvoiceRegistry.sol";
import { OfferMarket } from "./OfferMarket.sol";

/**
 * @title Escrow
 * @dev Manages the locking, release, repayment, and settlement of invoice financing funds.
 * While core terms remain encrypted, the physical funding transfers (ETH msg.value)
 * are managed as plaintext due to gas and transaction execution mechanics.
 */
contract Escrow {
    struct Vault {
        uint256 offerId;
        address lender;
        address merchant;
        uint256 amount;
        uint256 repaymentAmount;
        bool fundsReleased;
        bool repaid;
        bool settled;
    }

    InvoiceRegistry public immutable invoiceRegistry;
    OfferMarket public immutable offerMarket;

    mapping(uint256 => Vault) private _vaults;

    event FundsLocked(uint256 indexed invoiceId, InvoiceRegistry.InvoiceStatus status);
    event FundsReleased(uint256 indexed invoiceId, InvoiceRegistry.InvoiceStatus status);
    event InvoiceRepaid(uint256 indexed invoiceId, InvoiceRegistry.InvoiceStatus status);
    event InvoiceSettled(uint256 indexed invoiceId, InvoiceRegistry.InvoiceStatus status);

    constructor(address _invoiceRegistry, address _offerMarket) {
        require(_invoiceRegistry != address(0), "Escrow: invalid registry address");
        require(_offerMarket != address(0), "Escrow: invalid market address");
        invoiceRegistry = InvoiceRegistry(_invoiceRegistry);
        offerMarket = OfferMarket(_offerMarket);
    }

    /**
     * @notice Locks the plaintext ETH funding amount from the winning lender.
     * @param invoiceId The ID of the invoice
     * @param offerId The ID of the accepted offer
     */
    function lockFunds(uint256 invoiceId, uint256 offerId) external payable {
        require(msg.value > 0, "Escrow: must lock some ETH");
        require(_vaults[invoiceId].amount == 0, "Escrow: funds already locked for this invoice");

        // Verify the offer is accepted
        require(
            offerMarket.getOfferStatus(offerId) == OfferMarket.OfferStatus.Accepted,
            "Escrow: offer is not accepted"
        );

        // Verify the caller is the lender who submitted the offer
        OfferMarket.OfferMetadata[] memory metadata = offerMarket.getOffersForInvoice(invoiceId);
        address lender;
        for (uint256 i = 0; i < metadata.length; i++) {
            if (metadata[i].offerId == offerId) {
                lender = metadata[i].lender;
                break;
            }
        }
        require(lender != address(0), "Escrow: offer not found");
        require(msg.sender == lender, "Escrow: caller must be the lender");

        // Fetch merchant address from registry
        ( , , address merchant, ) = invoiceRegistry.getInvoiceMetadata(invoiceId);

        _vaults[invoiceId] = Vault({
            offerId: offerId,
            lender: lender,
            merchant: merchant,
            amount: msg.value,
            repaymentAmount: 0,
            fundsReleased: false,
            repaid: false,
            settled: false
        });

        emit FundsLocked(invoiceId, InvoiceRegistry.InvoiceStatus.Funded);
    }

    /**
     * @notice Releases the locked funding to the merchant, transitioning status to Financed.
     * @param invoiceId The ID of the invoice
     */
    function releaseFunds(uint256 invoiceId) external {
        Vault storage vault = _vaults[invoiceId];
        require(vault.amount > 0, "Escrow: no funds locked");
        require(!vault.fundsReleased, "Escrow: funds already released");
        require(msg.sender == vault.merchant, "Escrow: caller must be the merchant");

        vault.fundsReleased = true;

        // Transfer funds to the merchant
        (bool success, ) = payable(vault.merchant).call{value: vault.amount}("");
        require(success, "Escrow: transfer to merchant failed");

        // Update status in registry to Financed
        invoiceRegistry.updateStatus(invoiceId, InvoiceRegistry.InvoiceStatus.Financed);

        emit FundsReleased(invoiceId, InvoiceRegistry.InvoiceStatus.Financed);
    }

    /**
     * @notice Merchant repays the invoice at maturity.
     * @param invoiceId The ID of the invoice
     */
    function repay(uint256 invoiceId) external payable {
        Vault storage vault = _vaults[invoiceId];
        require(vault.fundsReleased, "Escrow: funds not released yet");
        require(!vault.repaid, "Escrow: invoice already repaid");
        require(msg.sender == vault.merchant, "Escrow: caller must be the merchant");
        require(msg.value > 0, "Escrow: repayment must contain ETH");

        vault.repaid = true;
        vault.repaymentAmount = msg.value;

        // Update status in registry to Repaid
        invoiceRegistry.updateStatus(invoiceId, InvoiceRegistry.InvoiceStatus.Repaid);

        emit InvoiceRepaid(invoiceId, InvoiceRegistry.InvoiceStatus.Repaid);
    }

    /**
     * @notice Transfers the repayment (principal + yield) back to the lender, settling the invoice.
     * @param invoiceId The ID of the invoice
     */
    function settleInvoice(uint256 invoiceId) external {
        Vault storage vault = _vaults[invoiceId];
        require(vault.repaid, "Escrow: invoice not repaid yet");
        require(!vault.settled, "Escrow: invoice already settled");

        uint256 repayment = vault.repaymentAmount;
        vault.settled = true;

        // Transfer repayment to lender
        (bool success, ) = payable(vault.lender).call{value: repayment}("");
        require(success, "Escrow: settlement transfer to lender failed");

        // Update status in registry to Settled
        invoiceRegistry.updateStatus(invoiceId, InvoiceRegistry.InvoiceStatus.Settled);

        emit InvoiceSettled(invoiceId, InvoiceRegistry.InvoiceStatus.Settled);
    }

    /**
     * @notice Helper to get vault data for testing and frontend verification.
     */
    function getVault(uint256 invoiceId)
        external
        view
        returns (
            uint256 offerId,
            address lender,
            address merchant,
            uint256 amount,
            uint256 repaymentAmount,
            bool fundsReleased,
            bool repaid,
            bool settled
        )
    {
        Vault storage vault = _vaults[invoiceId];
        return (
            vault.offerId,
            vault.lender,
            vault.merchant,
            vault.amount,
            vault.repaymentAmount,
            vault.fundsReleased,
            vault.repaid,
            vault.settled
        );
    }
}
