pragma solidity >=0.6.0 <0.8.0;
pragma abicoder v2;

import "./Wallet.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";

contract Dex is Wallet {
    using SafeMath for uint256;

    enum Side {BUY, SELL}

    struct Order {
        uint256 id;
        address trader;
        Side side;
        bytes32 ticker;
        uint256 amount;
        uint256 price;
    }

    uint256 public nextOrderId = 0;

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
                balances[msg.sender]["ETH"] >= amount.mul(price),
                "Insufficient funds to place buy order"
            );
        } else if (side == Side.SELL) {
            require(
                balances[msg.sender][ticker] >= amount,
                "Amount must be less than or equal to balance sold"
            );
        }

        Order[] storage orders = orderBook[ticker][uint256(side)];
        orders.push(
            Order(nextOrderId, msg.sender, side, ticker, amount, price)
        );

        //Bubble sort
        if (side == Side.BUY) {
            //[10,5,3,7]
            for (uint256 i = orders.length - 1; i >= 0; i--) {
                if (orders[i] > orders[i - 1]) {
                    Order memory order = order[i - 1];
                    orders[i - 1] = orders[i];
                    order[i] = temp;
                }
            }
        } else if (side == Side.SELL) {
            for (uint256 i = orders.length - 1; i >= 0; i--) {
                if (orders[i] < orders[i - 1]) {
                    Order memory order = order[i - 1];
                    orders[i - 1] = orders[i];
                    order[i] = temp;
                }
            }
        }

        nextOrderId++;
    }
}
