// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ─────────────────────────────────────────────────────────────────────────────
// SecureDocumentTransfer v2
//
// ON-CHAIN: metadata only — no file bytes, no keys, no IV raw values.
//
//  docHash          = SHA-256 of the original plaintext file  (proof of origin)
//  encryptedFileHash= SHA-256 of the encrypted .enc file      (integrity check)
//  encryptedKeyHash = SHA-256 of the RSA-OAEP wrapped AES key blob
//  ivHash           = SHA-256 of the AES-GCM 96-bit IV
//  algorithm        = "AES-256-GCM+RSA-OAEP-4096"
//
// OFF-CHAIN (local only): original file, .enc file, RSA keypair, raw AES key.
// ─────────────────────────────────────────────────────────────────────────────
contract SecureDocumentTransfer {
    struct Document {
        string  docHash;            // SHA-256(original plaintext file) — mapping key
        string  docName;            // Original file name
        string  encryptedFileHash;  // SHA-256(encrypted .enc file)
        string  encryptedKeyHash;   // SHA-256(RSA-OAEP wrapped AES key blob)
        string  ivHash;             // SHA-256(AES-GCM 96-bit IV)
        string  algorithm;          // e.g. "AES-256-GCM+RSA-OAEP-4096"
        address owner;              // Current owner address
        uint256 timestamp;          // Registration block timestamp (Unix)
    }

    mapping(string => Document) private documents;

    event DocumentRegistered(
        string  indexed docHash,
        string  docName,
        address indexed owner,
        string  algorithm,
        string  encryptedFileHash
    );
    event DocumentTransferred(
        string  indexed docHash,
        address indexed from,
        address indexed to
    );

    /// @notice Register encrypted document metadata. No file or key data stored.
    function registerDocument(
        string memory _docHash,
        string memory _docName,
        string memory _encryptedFileHash,
        string memory _encryptedKeyHash,
        string memory _ivHash,
        string memory _algorithm
    ) public {
        require(bytes(documents[_docHash].docHash).length == 0, "Dokumen sudah terdaftar.");

        documents[_docHash] = Document({
            docHash:           _docHash,
            docName:           _docName,
            encryptedFileHash: _encryptedFileHash,
            encryptedKeyHash:  _encryptedKeyHash,
            ivHash:            _ivHash,
            algorithm:         _algorithm,
            owner:             msg.sender,
            timestamp:         block.timestamp
        });

        emit DocumentRegistered(_docHash, _docName, msg.sender, _algorithm, _encryptedFileHash);
    }

    function transferDocument(string memory _docHash, address _newOwner) public {
        require(documents[_docHash].owner == msg.sender, "Anda bukan pemilik dokumen ini.");
        require(_newOwner != address(0), "Alamat penerima tidak valid.");

        address prev = documents[_docHash].owner;
        documents[_docHash].owner = _newOwner;

        emit DocumentTransferred(_docHash, prev, _newOwner);
    }

    function getDocument(string memory _docHash)
        public view
        returns (
            string  memory docName,
            address        owner,
            uint256        timestamp,
            string  memory encryptedFileHash,
            string  memory encryptedKeyHash,
            string  memory ivHash,
            string  memory algorithm
        )
    {
        require(bytes(documents[_docHash].docHash).length != 0, "Dokumen tidak ditemukan.");
        Document memory doc = documents[_docHash];
        return (
            doc.docName,
            doc.owner,
            doc.timestamp,
            doc.encryptedFileHash,
            doc.encryptedKeyHash,
            doc.ivHash,
            doc.algorithm
        );
    }
}
