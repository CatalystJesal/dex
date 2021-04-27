pragma solidity >=0.6.0 <0.8.0;
pragma abicoder v2;

import "./Wallet.sol";

contract Dex is Wallet {
    enum Side {BUY, SELL}

    struct Order {
        uint256 id;
        address trader;
        bool buyOrder;
        bytes32 ticker;
        uint256 amount;
        uint256 price;
    }

    mapping(bytes32 => mapping(uint256 => Order[])) public orderBook;

    function getOrderBook(bytes32 ticker, Side side)
        public
        view
        returns (Order[] memory)
    {
        return orderBook[ticker][uint256(side)];
    }

    function createLimitOrder(
        bytes32 ticker,
        Side side,
        uint256 amount,
        uint256 price
    ) public {
        require(
            amount >= 0,
            "Must supply a non-zero amount you would like to buy/sell"
        );
        if (side == Side.BUY) {
            require(
                balances[msg.sender][bytes32("ETH")] >= price,
                "Insufficient funds to place buy order"
            );
        } else if (side == Side.SELL) {
            require(
                balances[msg.sender][ticker] >= amount,
                "Amount must be less than or equal to balance sold"
            );
        }
        //add order based on price the person wants to buy at
        //we need to ensure the orderbook is sorted:
        //  BUY (highest price first <-> lowest price last)
        //  SELL (highest price first <-> lowest price last)
    }
}
