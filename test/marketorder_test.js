const Dex = artifacts.require("Dex");
const Link = artifacts.require("Link");
const truffleAssert = require("truffle-assertions");

contract("Dex", (accounts) => {
  let Side = {
    BUY: 0,
    SELL: 1,
  };
  describe("Orders - Market Orders", function () {
    it("should not create a SELL market order without sufficient token balance", async () => {
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

    it("should allow BUY market orders to be submitted even if the order book is empty", async () => {
      let dex = await Dex.deployed();

      await dex.depositEth({
        value: 5000,
        from: accounts[0],
      });

      let orderbook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.BUY
      );

      assert(
        orderbook.length == 0,
        "BUY order book must be zero initially before test"
      );

      truffleAssert.passes(
        await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 2, {
          from: accounts[0],
        })
      );
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

      truffleAssert.passes(
        await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.SELL, 2, {
          from: accounts[0],
        })
      );
    });

    it("should allow BUY market orders to be 100% filled from one or more sell limit orders", async () => {
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
        6,
        15,
        {
          from: accounts[3],
        }
      );

      await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 6, {
        from: accounts[0],
      });

      let orderbook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.SELL
      );

      assert.equal(orderbook.length, 2);
    });

    //or the market order is 100% filled (next test)
    it("should allow BUY market orders to be filled until the order book is empty", async () => {
      let dex = await Dex.deployed();

      let orderbook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.SELL
      );

      assert(
        orderbook.length > 0,
        "orderbook should be non-zero length initially before testing"
      );

      await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 15, {
        from: accounts[0],
      });

      orderbook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.SELL
      );

      assert.equal(orderbook.length, 0);
    });

    it("should allow SELL market orders to be 100% filled from one or more buy limit orders", async () => {
      let dex = await Dex.deployed();

      await dex.depositEth({ value: 1000, from: accounts[1] });
      await dex.depositEth({ value: 1000, from: accounts[2] });
      await dex.depositEth({ value: 1000, from: accounts[3] });

      await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 5, 20, {
        from: accounts[1],
      });
      await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 7, 10, {
        from: accounts[2],
      });
      await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 9, 15, {
        from: accounts[3],
      });

      await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.SELL, 8, {
        from: accounts[0],
      });

      let orderbook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.BUY
      );

      assert.equal(orderbook.length, 2);
    });

    it("should allow SELL market orders to be filled until the order book is empty", async () => {
      let dex = await Dex.deployed();

      let orderbook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.BUY
      );

      assert(
        orderbook.length > 0,
        "orderbook should be non-zero length initially before testing"
      );

      await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.SELL, 15, {
        from: accounts[0],
      });

      orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), Side.BUY);

      assert.equal(orderbook.length, 0);
    });

    it("should ensure ETH balance of the BUYER is correctly decreased (cost += filled amount * price)", async () => {
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

      await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 3, {
        from: accounts[0],
      });

      let latestBalance = await dex.balances(
        accounts[0],
        web3.utils.fromUtf8("ETH")
      );

      assert.equal(balance.toNumber() - 3 * 10, latestBalance.toNumber());
    });

    it("should ensure token balance of the SELLER is correctly decreased (token balance - filled amount)", async () => {
      let dex = await Dex.deployed();

      await dex.createLimitOrder(
        web3.utils.fromUtf8("LINK"),
        Side.SELL,
        7,
        10,
        {
          from: accounts[1],
        }
      );

      let balance = await dex.balances(
        accounts[1],
        web3.utils.fromUtf8("LINK")
      );

      await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 3, {
        from: accounts[0],
      });

      let orderbook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.SELL
      );

      let latestBalance = await dex.balances(
        accounts[1],
        web3.utils.fromUtf8("LINK")
      );

      assert.equal(
        balance.toNumber() - orderbook[0].filled,
        latestBalance.toNumber()
      );
    });

    it("should ensure ETH balance is correctly increased for seller's limit order upon BUY market order fulfilment", async () => {
      //TO DO
    });
    it("should ensure token balance is correctly increased for buyer upon market order fulfilment", async () => {
      //TO DO
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

      await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.SELL, 7, 9, {
        from: accounts[1],
      });

      let orderbook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.SELL
      );

      assert(
        orderbook.length > 0,
        "Order book must be non-zero length before this test can happen"
      );

      await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 11, {
        from: accounts[0],
      });

      orderbook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.SELL
      );

      assert.equal(orderbook.length, 1);
    });

    it("should ensure filled BUY limit orders are removed from the order book", async () => {
      let dex = await Dex.deployed();

      await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 6, 12, {
        from: accounts[1],
      });

      await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 4, 8, {
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

      await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.SELL, 6, {
        from: accounts[0],
      });

      orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), Side.BUY);

      assert.equal(orderbook.length, 1);
    });

    it("should not create a BUY market order without sufficient ETH balance", async () => {
      let dex = await Dex.new();
      let link = await Link.deployed();

      await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {
        from: accounts[0],
      });

      await link.transfer(accounts[1], 100);

      await link.approve(dex.address, 100, { from: accounts[1] });

      await dex.deposit(100, web3.utils.fromUtf8("LINK"), {
        from: accounts[1],
      });

      let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));

      assert(
        balance.toNumber() == 0,
        "ETH balance must be zero before verifying this test"
      );

      await dex.createLimitOrder(
        web3.utils.fromUtf8("LINK"),
        Side.SELL,
        5,
        10,
        {
          from: accounts[1],
        }
      );

      await truffleAssert.reverts(
        dex.createMarketOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 3, {
          from: accounts[0],
        })
      );
    });
  });
});
