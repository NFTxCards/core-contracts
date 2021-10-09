// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import '@openzeppelin/contracts/access/Ownable.sol';

contract ERC721Token is ERC721, Ownable {
  uint256 private _price = 0.06 ether;

  constructor(string memory baseURI) ERC721("BASE Token", "BST") {
    _setBaseURI(baseURI);
  }

  function setPrice(uint256 _newPrice) public onlyOwner() {
    _price = _newPrice;
  }

  function getPrice() public view returns (uint256){
    return _price;
  }

  function giveAway(address _to, uint256 _amount) external onlyOwner() {
    uint256 supply = totalSupply();

    for(uint256 i; i < _amount; i++){
      _safeMint( _to, supply + i );
    }
  }

  function buyToken(uint256 _tokenId) public payable {
    require(msg.value >= _price, "not enough fund");
    _safeMint(msg.sender, _tokenId);
  }
}
