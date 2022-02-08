// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "../tokens/ERC20Permit.sol";

contract ERC20TokenMock is ERC20Permit {
    constructor(uint256 initialSupply) ERC20("Token Mock", "MCK") {
        _mint(msg.sender, initialSupply);
    }

    function mint(address _holder, uint256 _value) external {
        _mint(_holder, _value);
    }
}
