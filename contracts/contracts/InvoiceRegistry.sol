// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.28;

import { FHE, euint64, euint32, eaddress } from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import { InEuint64, InEaddress, InEuint32 } from "@fhenixprotocol/cofhe-contracts/ICofhe.sol";

/**
 * @title InvoiceRegistry
 * @dev Manages private invoice records using Fhenix CoFHE.
 * Invoice sensitive data (amount, buyer address, due date) are encrypted on-chain
 * using Fhenix homomorphic encryption types to ensure end-to-end privacy.
 */
contract InvoiceRegistry {
    enum InvoiceStatus { Created, Listed, Funded, Financed, Repaid, Settled }

    struct Invoice {
        uint256 id;
        euint64 amount;      // Encrypted face value of the invoice
        eaddress buyer;      // Encrypted address of the debtor/buyer
        euint32 dueDate;     // Encrypted timestamp of the due date
        InvoiceStatus status;
        address merchant;
        uint256 listedAt;
    }

    address public owner;
    address public offerMarket;
    address public escrow;

    uint256 private _nextInvoiceId;
    mapping(uint256 => Invoice) private _invoices;

    event InvoiceCreated(uint256 indexed invoiceId, InvoiceStatus status, address indexed merchant);
    event InvoiceListed(uint256 indexed invoiceId, InvoiceStatus status);

    modifier onlyOwner() {
        require(msg.sender == owner, "InvoiceRegistry: caller is not the owner");
        _;
    }

    modifier onlyMerchant(uint256 invoiceId) {
        require(_invoices[invoiceId].id != 0, "InvoiceRegistry: invoice does not exist");
        require(_invoices[invoiceId].merchant == msg.sender, "InvoiceRegistry: caller is not the merchant");
        _;
    }

    constructor() {
        owner = msg.sender;
        _nextInvoiceId = 1;
    }

    /**
     * @notice Authorizes the OfferMarket address to call updateStatus.
     */
    function setOfferMarket(address _offerMarket) external onlyOwner {
        offerMarket = _offerMarket;
    }

    /**
     * @notice Authorizes the Escrow address to call updateStatus.
     */
    function setEscrow(address _escrow) external onlyOwner {
        escrow = _escrow;
    }

    /**
     * @notice Callback for authorized OfferMarket or Escrow contract to update invoice status.
     */
    function updateStatus(uint256 invoiceId, InvoiceStatus newStatus) external {
        require(msg.sender == offerMarket || msg.sender == escrow, "InvoiceRegistry: caller is not authorized");
        require(_invoices[invoiceId].id != 0, "InvoiceRegistry: invoice does not exist");
        _invoices[invoiceId].status = newStatus;
    }

    /**
     * @notice Registers a new invoice with encrypted values.
     * @param encryptedAmount The FHE encrypted amount (euint64)
     * @param encryptedBuyer The FHE encrypted debtor address (eaddress)
     * @param encryptedDueDate The FHE encrypted due date timestamp (euint32)
     * @return The plaintext invoice ID assigned to this registry entry.
     */
    function createInvoice(
        InEuint64 calldata encryptedAmount,
        InEaddress calldata encryptedBuyer,
        InEuint32 calldata encryptedDueDate
    ) external returns (uint256) {
        uint256 invoiceId = _nextInvoiceId++;

        // Verify FHE inputs and cast them into their homomorphic types
        euint64 amount = FHE.asEuint64(encryptedAmount);
        eaddress buyer = FHE.asEaddress(encryptedBuyer);
        euint32 dueDate = FHE.asEuint32(encryptedDueDate);

        // Grant FHE decryption permission to the merchant (sender) for their own data
        FHE.allowSender(amount);
        FHE.allowSender(buyer);
        FHE.allowSender(dueDate);

        _invoices[invoiceId] = Invoice({
            id: invoiceId,
            amount: amount,
            buyer: buyer,
            dueDate: dueDate,
            status: InvoiceStatus.Created,
            merchant: msg.sender,
            listedAt: 0
        });

        emit InvoiceCreated(invoiceId, InvoiceStatus.Created, msg.sender);
        return invoiceId;
    }

    /**
     * @notice Lists a registered invoice on the receivables marketplace.
     * @param invoiceId The ID of the invoice to list.
     */
    function listOnMarketplace(uint256 invoiceId) external onlyMerchant(invoiceId) {
        Invoice storage inv = _invoices[invoiceId];
        require(inv.status == InvoiceStatus.Created, "InvoiceRegistry: invoice must be in Created state");

        inv.status = InvoiceStatus.Listed;
        inv.listedAt = block.timestamp;

        emit InvoiceListed(invoiceId, InvoiceStatus.Listed);
    }

    /**
     * @notice Returns non-sensitive public metadata for an invoice.
     * @param invoiceId The ID of the invoice.
     * @return id The plaintext invoice ID
     * @return status The current enum status of the invoice
     * @return merchant The registering merchant's address
     * @return listedAt The block timestamp when the invoice was listed
     */
    function getInvoiceMetadata(uint256 invoiceId)
        external
        view
        returns (
            uint256 id,
            InvoiceStatus status,
            address merchant,
            uint256 listedAt
        )
    {
        Invoice storage inv = _invoices[invoiceId];
        require(inv.id != 0, "InvoiceRegistry: invoice does not exist");
        return (inv.id, inv.status, inv.merchant, inv.listedAt);
    }

    /**
     * @notice Returns FHE encrypted data handles for authorized viewing or homomorphic computations.
     * @param invoiceId The ID of the invoice.
     * @return amount The encrypted amount handle (euint64)
     * @return buyer The encrypted buyer address handle (eaddress)
     * @return dueDate The encrypted due date handle (euint32)
     */
    function getEncryptedInvoiceData(uint256 invoiceId)
        external
        view
        returns (
            euint64 amount,
            eaddress buyer,
            euint32 dueDate
        )
    {
        Invoice storage inv = _invoices[invoiceId];
        require(inv.id != 0, "InvoiceRegistry: invoice does not exist");
        return (inv.amount, inv.buyer, inv.dueDate);
    }
}
