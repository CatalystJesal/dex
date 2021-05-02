const Dex = artifacts.require("Dex");
const Link = artifacts.require("Link");
const truffleAssert = require("truffle-assertions");

contract("Dex", (accounts) => {
  let Side = {
    BUY: 0,
    SELL: 1,
  };
  describe("Orders - Market Orders", function () {
    it("should ensure seller has enough LINK tokens for the trade when creating a SELL market order", async () => {
      let dex = await Dex.deployed();
      let link = await Link.deployed();

      await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {
        from: accounts[0],
      });

      let balance = await dex.balances(
        accounts[0],
        web3.utils.fromUtf8("LINK")
      );

      assert(
        balance.toNumber() == 0,
        "LINK balance must be zero before verifying this test"
      );

      await truffleAssert.reverts(
        dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.SELL, 20, {
          from: accounts[0],
        })
      );
    });

    it("should ensure buyer has enough ETH tokens for the trade when creating a BUY market order", async () => {
      let dex = await Dex.deployed();
      let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));

      assert(
        balance.toNumber() == 0,
        "ETH balance must be zero before verifying this test"
      );

      await truffleAssert.reverts(
        dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 3, {
          from: accounts[0],
        })
      );
    });

    it("should allow BUY market orders to be submitted even if the order book is empty", async () => {
      let dex = await Dex.deployed();

      await dex.depositEth({ value: 1000, from: accounts[0] });

      let orderbook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.BUY
      );

      assert(
        orderbook.length == 0,
        "BUY order book must be zero initially before test"
      );

      await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 2, {
        from: accounts[0],
      });

      orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), Side.BUY);

      assert.equal(orderbook.length, 0);
    });

    it("should allow SELL market orders to be submitted even if the order book is empty", async () => {
      let dex = await Dex.deployed();
      let link = await Link.deployed();
      await link.approve(dex.address, 100);

      await dex.deposit(100, web3.utils.fromUtf8("LINK"));

      let orderbook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.SELL
      );

      assert(
        orderbook.length == 0,
        "SELL order book must be zero initially before test"
      );

      await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.SELL, 2, {
        from: accounts[0],
      });

      orderbook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.SELL
      );

      assert.equal(orderbook.length, 0);
    });

    it("should allow BUY market orders to be 100% filled when buy amount <= sell amount", async () => {
      let dex = await Dex.deployed();
      let link = await Link.deployed();
      await link.transfer(accounts[1], 100);
      await link.transfer(accounts[2], 100);
      await link.transfer(accounts[3], 100);

      await link.approve(dex.address, 100, { from: accounts[1] });
      await link.approve(dex.address, 100, { from: accounts[2] });
      await link.approve(dex.address, 100, { from: accounts[3] });

      await dex.deposit(100, web3.utils.fromUtf8("LINK"), {
        from: accounts[1],
      });
      await dex.deposit(100, web3.utils.fromUtf8("LINK"), {
        from: accounts[2],
      });
      await dex.deposit(100, web3.utils.fromUtf8("LINK"), {
        from: accounts[3],
      });

      await dex.createLimitOrder(
        web3.utils.fromUtf8("LINK"),
        Side.SELL,
        5,
        10,
        {
          from: accounts[1],
        }
      );
      await dex.createLimitOrder(
        web3.utils.fromUtf8("LINK"),
        Side.SELL,
        7,
        20,
        {
          from: accounts[2],
        }
      );
      await dex.createLimitOrder(
        web3.utils.fromUtf8("LINK"),
        Side.SELL,
        7,
        15,
        {
          from: accounts[3],
        }
      );

      await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 5, {
        from: accounts[0],
      });

      let marketOrders = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.SELL
      );

      assert.equal(marketOrders[0].filled, 5);
    });

    //or the market order is 100% filled (next test)
    it("should allow BUY market orders to be filled until the order book is empty", async () => {
      let dex = await Dex.deployed();

      await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 14, {
        from: accounts[0],
      });

      let orderbook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.SELL
      );

      console.log("orderbook length: " + orderbook.length);

      assert.equal(orderbook.length, 0);
    });

    it("should ensure SELL market orders are 100% filled when sell amount <= buy amount", async () => {
      let dex = await Dex.deployed();

      await dex.depositEth({ value: 1000, from: accounts[1] });
      await dex.depositEth({ value: 1000, from: accounts[2] });
      await dex.depositEth({ value: 1000, from: accounts[3] });

      await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 5, 10, {
        from: accounts[1],
      });
      await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 7, 20, {
        from: accounts[2],
      });
      await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 7, 15, {
        from: accounts[3],
      });

      await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.SELL, 8, {
        from: accounts[0],
      });

      let marketOrders = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.SELL
      );

      assert.equal(marketOrders[0].filled, marketOrders[0].amount);
    });

    it("should ensure SELL market orders are filled until the order book is empty", async () => {
      let dex = await Dex.deployed();

      await dex.depositEth({ value: 1000, from: accounts[1] });
      await dex.depositEth({ value: 1000, from: accounts[2] });
      await dex.depositEth({ value: 1000, from: accounts[3] });

      await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 5, 10, {
        from: accounts[1],
      });
      await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 7, 20, {
        from: accounts[2],
      });
      await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 7, 15, {
        from: accounts[3],
      });

      await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.SELL, 30, {
        from: accounts[0],
      });

      let orderbook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.SELL
      );

      assert.equal(orderbook.length, 0);
    });

    it("should ensure ETH balance of the BUYER is decreased with the filled amount", async () => {
      let dex = await Dex.deployed();

      let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));

      await dex.createLimitOrder(
        web3.utils.fromUtf8("LINK"),
        Side.SELL,
        3,
        10,
        {
          from: accounts[1],
        }
      );

      let orderbook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.SELL
      );

      await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 3, {
        from: accounts[0],
      });

      let latestBalance = await dex.balances(
        accounts[0],
        web3.utils.fromUtf8("ETH")
      );

      let marketOrders = await dex.getMarketOrders(
        web3.utils.fromUtf8("LINK"),
        Side.SELL
      );

      assert.equal(
        balance.toNumber() - marketOrders[0].filled,
        latestBalance.toNumber()
      );
    });

    it("should ensure LINK balance of the SELLER is decreased with the filled amount", async () => {
      let dex = await Dex.deployed();
      let balance = await dex.balances(
        accounts[1],
        web3.utils.fromUtf8("LINK")
      );

      await dex.createLimitOrder(
        web3.utils.fromUtf8("LINK"),
        Side.SELL,
        7,
        10,
        {
          from: accounts[1],
        }
      );

      let orderbook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.SELL
      );

      await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 3, {
        from: accounts[0],
      });

      let latestBalance = await dex.balances(
        accounts[1],
        web3.utils.fromUtf8("LINK")
      );

      assert.equal(
        balance.toNumber() - orderbook[0].filled,
        latestBalance.toNumber()
      );
    });

    it("should ensure filled SELL limit orders are removed from the order book", async () => {
      let dex = await Dex.deployed();
      await dex.createLimitOrder(
        web3.utils.fromUtf8("LINK"),
        Side.SELL,
        3,
        10,
        {
          from: accounts[1],
        }
      );

      let orderbook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.SELL
      );

      await dex.createLimitOrder(
        web3.utils.fromUtf8("LINK"),
        Side.SELL,
        3,
        10,
        {
          from: accounts[1],
        }
      );

      assert(
        orderbook.length > 0,
        "Order book must be non-zero before this test can happen"
      );

      await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 3, {
        from: accounts[0],
      });

      let latestorderbook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.SELL
      );

      assert(
        latestorderbook.length < orderbook.length,
        "filled order from the orderbook wasn't removed"
      );
    });

    it("should ensure filled BUY limit orders are removed from the order book", async () => {
      let dex = await Dex.deployed();

      await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 3, 10, {
        from: accounts[1],
      });

      let orderbook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.BUY
      );

      assert(
        orderbook.length > 0,
        "Order book must be non-zero before this test can happen"
      );

      await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.SELL, 3, {
        from: accounts[0],
      });

      let latestorderbook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.SELL
      );

      assert(
        latestorderbook.length < orderbook.length,
        "filled order from the orderbook wasn't removed"
      );
    });
  });
});
