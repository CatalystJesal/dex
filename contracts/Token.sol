pragma solidity >=0.6.0 <0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Link is ERC20 {
    constructor() public ERC20("Chainlink", "LINK") {
        _mint(msg.sender, 1000);
    }
}
