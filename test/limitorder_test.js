const Dex = artifacts.require("Dex");
const Link = artifacts.require("Link");
const truffleAssert = require("truffle-assertions");

contract.skip("Dex", (accounts) => {
  let Side = {
    BUY: 0,
    SELL: 1,
  };

  describe("Orders - Limit Orders", function () {
    it("should be able to place a BUY limit order where ETH balance > BUY price", async () => {
      let dex = await Dex.deployed();
      let link = await Link.deployed();

      await truffleAssert.passes(
        dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {
          from: accounts[0],
        })
      );

      await truffleAssert.reverts(
        dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 4, 300)
      );

      await link.approve(dex.address, 500);
      dex.depositEth({ value: web3.utils.toWei("1", "ether") });

      // 0 means BUY
      await truffleAssert.passes(
        dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 3, 100)
      );
    });

    it("should be able to place a SELL limit order where token balance >= SELL order amount", async () => {
      let dex = await Dex.deployed();
      let link = await Link.deployed();

      await link.approve(dex.address, 500);
      await dex.deposit(100, web3.utils.fromUtf8("LINK"));

      // 1 means SELL
      await truffleAssert.passes(
        dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.SELL, 2, 400, {
          from: accounts[0],
        })
      );

      await truffleAssert.reverts(
        dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.SELL, 150, 400, {
          from: accounts[0],
        })
      );
    });

    it("should ensure the BUY order book is ordered on price from highest to lowest", async () => {
      let dex = await Dex.deployed();
      let link = await Link.deployed();

      await link.approve(dex.address, 500);
      await dex.deposit(100, web3.utils.fromUtf8("LINK"));

      dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 10, 100);
      dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 6, 500);
      dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 5, 300);

      let orderBook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.BUY
      );

      assert(orderBook.length > 0);

      for (let i = 0; i < orderBook.length - 1; i++) {
        assert(
          orderBook[i].price >= orderBook[i + 1].price,
          "BUY order book isn't ordered"
        );
      }
    });

    it("should ensure the SELL order book is ordered on price from lowest to highest", async () => {
      let dex = await Dex.deployed();
      let link = await Link.deployed();

      await link.approve(dex.address, 500);
      await dex.deposit(100, web3.utils.fromUtf8("LINK"));

      dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.SELL, 10, 200, {
        from: accounts[0],
      });
      dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.SELL, 20, 400, {
        from: accounts[0],
      });
      dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.SELL, 5, 300, {
        from: accounts[0],
      });

      let orderBook = await dex.getOrderBook(
        web3.utils.fromUtf8("LINK"),
        Side.SELL
      );

      assert(orderBook.length > 0);

      for (let i = 0; i < orderBook.length - 1; i++) {
        assert(
          orderBook[i].price <= orderBook[i + 1].price,
          "SELL order book isn't ordered"
        );
      }
    });
  });
});
