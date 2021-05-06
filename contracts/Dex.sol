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
        uint256 filled;
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
            Order(nextOrderId, msg.sender, side, ticker, amount, price, 0)
        );

        if (orders.length > 0) {
            sortOrderBook(orders, side);
        }

        nextOrderId++;
    }

    function createMarketOrder(
        bytes32 ticker,
        Side side,
        uint256 amount
    ) public {
        uint256 orderBookSide;
        if (side == Side.BUY) {
            orderBookSide = 1;
        } else if (side == Side.SELL) {
            require(
                amount <= balances[msg.sender][ticker],
                "You do not have enough tokens"
            );
            orderBookSide = 0;
        }

        Order[] storage orders = orderBook[ticker][orderBookSide];

        uint256 totalFilled;

        for (uint256 i = 0; i < orders.length && totalFilled < amount; i++) {
            uint256 limitOrderAmount = orders[i].amount.sub(orders[i].filled);
            uint256 remaining = amount.sub(totalFilled);
            uint256 filled = 0;
            uint256 cost = 0;

            if (remaining >= limitOrderAmount) {
                filled = limitOrderAmount;
                cost = cost.add(orders[i].price.mul(limitOrderAmount));
                totalFilled = totalFilled.add(limitOrderAmount);
                orders[i].filled = orders[i].filled.add(limitOrderAmount);
            } else if (remaining < limitOrderAmount) {
                filled = remaining;
                cost = cost.add(orders[i].price.mul(filled));
                totalFilled = totalFilled.add(filled);
                orders[i].filled = orders[i].filled.add(filled);
            }

            if (side == Side.BUY) {
                require(
                    balances[msg.sender]["ETH"] >= cost,
                    "Insufficient ETH balance to place this market order"
                );
                balances[orders[i].trader][ticker] = balances[orders[i].trader][
                    ticker
                ]
                    .sub(filled);
                balances[msg.sender]["ETH"] = balances[msg.sender]["ETH"].sub(
                    cost
                );
                balances[msg.sender][ticker] = balances[msg.sender][ticker].add(
                    filled
                );
                balances[orders[i].trader]["ETH"] = balances[orders[i].trader][
                    "ETH"
                ]
                    .add(cost);
            } else {
                balances[msg.sender][ticker] = balances[msg.sender][ticker].sub(
                    filled
                );
                balances[orders[i].trader]["ETH"] = balances[orders[i].trader][
                    "ETH"
                ]
                    .sub(cost);
                balances[orders[i].trader][ticker] = balances[orders[i].trader][
                    ticker
                ]
                    .add(filled);

                balances[msg.sender]["ETH"] = balances[msg.sender]["ETH"].add(
                    cost
                );
            }
        }

        removeFilledOrders(orders);

        if (orders.length > 0) {
            if (side == Side.BUY) {
                sortOrderBook(orders, Side.SELL);
            } else if (side == Side.SELL) {
                sortOrderBook(orders, Side.BUY);
            }
        }
    }

    // function calculateBalances(
    //     bytes32 ticker,
    //     Side side,
    //     uint256 filled,
    //     uint256 cost,
    // ) private {
    //     if (side == Side.BUY) {

    //     } else if (side == Side.SELL) {

    //     }
    // }

    function sortOrderBook(Order[] storage orders, Side side) private {
        if (side == Side.BUY) {
            for (uint256 i = orders.length - 1; i > 0; i--) {
                if (orders[i].price > orders[i - 1].price) {
                    Order memory temp = orders[i - 1];
                    orders[i - 1] = orders[i];
                    orders[i] = temp;
                }
            }
        } else if (side == Side.SELL) {
            for (uint256 i = orders.length - 1; i > 0; i--) {
                if (orders[i].price < orders[i - 1].price) {
                    Order memory temp = orders[i - 1];
                    orders[i - 1] = orders[i];
                    orders[i] = temp;
                }
            }
        }
    }

    function removeFilledOrders(Order[] storage orders) private {
        for (uint256 i = 0; i < orders.length; i++) {
            if (orders[i].amount == orders[i].filled) {
                Order memory _order = orders[orders.length - 1];
                orders[i] = _order;
                orders.pop();
            }
        }

        if (orders.length == 1 && orders[0].amount == orders[0].filled) {
            orders.pop();
        }
    }
}
