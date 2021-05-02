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

    mapping(bytes32 => mapping(uint256 => Order[])) public marketOrders;

    function getOrderBook(bytes32 ticker, Side side)
        public
        view
        returns (Order[] memory)
    {
        return orderBook[ticker][uint256(side)];
    }

    function getMarketOrders(bytes32 ticker, Side side)
        public
        view
        returns (Order[] memory)
    {
        return marketOrders[ticker][uint256(side)];
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

        // Bubble sort
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
        if (side == Side.SELL) {
            require(
                amount <= balances[msg.sender][ticker],
                "You do not have enough tokens"
            );
        } else if (side == Side.BUY) {
            //will need to loop through to ch
        }
        //32
        //[20, 10, 5]
        //1) if the person is putting in a SELL order look inside BUY order side, vice versa
        //2) temp_amount = amount
        //3) (if SELL) while (temp_amount > 0 and currentOrderIndex < orders.length)
        //4) temp_amount -= orderbook[ticker][BUY][counter].amount; orderbook[ticker][BUY][counter].amount -= temp_amount
        //4.1) if(orderbook[ticker][BUY][counter].amount == 0) status = filled
        //4) while (amount - orderbook[ticker][BUY][counter].amount > 0 and currentOrderIndex < orders.length) go to the next Order[] in the list and repeat 2) and 3)  )
        //5) Now we must take the price of
    }

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

    function isBuyable(bytes32 ticker, uint256 amount) public {}
}
