// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SecureDocumentTransfer {
    struct Document {
        string docHash;      // Hash SHA-256 atau CID IPFS dari dokumen
        string docName;      // Nama dokumen
        address owner;       // Alamat pemilik saat ini
        uint256 timestamp;   // Waktu pendaftaran
    }

    mapping(string => Document) private documents;

    event DocumentRegistered(string docHash, string docName, address indexed owner);
    event DocumentTransferred(string docHash, address indexed from, address indexed to);

    function registerDocument(string memory _docHash, string memory _docName) public {
        require(bytes(documents[_docHash].docHash).length == 0, "Dokumen sudah terdaftar.");
        
        documents[_docHash] = Document({
            docHash: _docHash,
            docName: _docName,
            owner: msg.sender,
            timestamp: block.timestamp
        });

        emit DocumentRegistered(_docHash, _docName, msg.sender);
    }

    function transferDocument(string memory _docHash, address _newOwner) public {
        require(documents[_docHash].owner == msg.sender, "Anda bukan pemilik dokumen ini.");
        require(_newOwner != address(0), "Alamat penerima tidak valid.");

        documents[_docHash].owner = _newOwner;

        emit DocumentTransferred(_docHash, msg.sender, _newOwner);
    }

    function getDocument(string memory _docHash) public view returns (string memory docName, address owner, uint256 timestamp) {
        require(bytes(documents[_docHash].docHash).length != 0, "Dokumen tidak ditemukan.");
        Document memory doc = documents[_docHash];
        return (doc.docName, doc.owner, doc.timestamp);
    }
}
