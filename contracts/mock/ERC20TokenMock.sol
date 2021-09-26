// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20TokenMock is ERC20 {
  constructor(uint256 initialSupply) ERC20("Token Mock", "MCK") {
    _mint(msg.sender, initialSupply);
  }

  function mint(address _holder, uint256 _value) external {
    _mint(_holder, _value);
  }
}
