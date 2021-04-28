const Dex = artifacts.require("Dex");
const Link = artifacts.require("Link");
const truffleAssert = require("truffle-assertions");

contract("Dex", (accounts) => {
  let Side = {
    BUY: 0,
    SELL: 1,
  };

  it("should only be possible for the owner to add tokens", async () => {
    let dex = await Dex.deployed();
    let link = await Link.deployed();
    await truffleAssert.passes(
      dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {
        from: accounts[0],
      })
    );

    await truffleAssert.passes(
      dex.addToken(web3.utils.fromUtf8("ETH"), link.address, {
        from: accounts[0],
      })
    );

    await truffleAssert.reverts(
      dex.addToken(web3.utils.fromUtf8("AAVE"), link.address, {
        from: accounts[1],
      })
    );
  });

  it("should not allow the same token ticker to be added twice by the owner", async () => {
    let dex = await Dex.deployed();
    let link = await Link.deployed();

    await truffleAssert.reverts(
      dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {
        from: accounts[0],
      })
    );
  });

  it("should handle deposits correctly", async () => {
    let dex = await Dex.deployed();
    let link = await Link.deployed();

    await link.approve(dex.address, 500);

    await dex.deposit(100, web3.utils.fromUtf8("LINK"));

    let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));

    assert.equal(balance.toNumber(), 100);
  });

  it("should handle faulty withdrawals correctly", async () => {
    let dex = await Dex.deployed();
    let link = await Link.deployed();

    await truffleAssert.reverts(dex.withdraw(500, web3.utils.fromUtf8("LINK")));
  });

  it("should handle correct withdrawals correctly", async () => {
    let dex = await Dex.deployed();
    let link = await Link.deployed();

    await truffleAssert.passes(dex.withdraw(100, web3.utils.fromUtf8("LINK")));
  });

  it("should be able to place a BUY limit order where ETH balance > BUY price", async () => {
    let dex = await Dex.deployed();
    let link = await Link.deployed();

    await truffleAssert.reverts(
      dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 30, 2)
    );

    dex.depositEth({ value: 500 });

    // 0 means BUY
    await truffleAssert.passes(
      dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 30, 0)
    );
  });

  it("should be able to place a SELL limit order where token balance >= SELL order amount", async () => {
    let dex = await Dex.deployed();
    let link = await Link.deployed();

    await link.approve(dex.address, 500);

    await dex.deposit(100, web3.utils.fromUtf8("LINK"));

    // 1 means SELL
    await truffleAssert.passes(
      dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.SELL, 50, 4, {
        from: accounts[0],
      })
    );

    await truffleAssert.reverts(
      dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.SELL, 150, 4, {
        from: accounts[0],
      })
    );
  });

  it("should ensure the BUY order book is ordered on price from highest to lowest", async () => {
    let dex = await Dex.deployed();
    let link = await Link.deployed();

    dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 50, 4, {
      from: accounts[0],
    });
    dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 100, 4, {
      from: accounts[0],
    });
    dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.BUY, 80, 4, {
      from: accounts[0],
    });

    let orderBook = await dex.getOrderBook(
      web3.utils.fromUtf8("LINK"),
      Side.BUY
    );
    // let orderBook = [100, 50, 250];

    assert(orderBook.length > 0);

    for (let i = 0; i < orderBook.length - 1; i++) {
      console.log("i: " + i);
      for (let j = i + 1; j < orderBook.length; j++) {
        console.log("j: " + j);
        assert(orderBook[i] > orderBook[j]);
      }
    }
  });

  it("should ensure the SELL order book is ordered on price from lowest to highest", async () => {
    let dex = await Dex.deployed();
    let link = await Link.deployed();

    dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.SELL, 10, 4, {
      from: accounts[0],
    });
    dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.SELL, 20, 4, {
      from: accounts[0],
    });
    dex.createLimitOrder(web3.utils.fromUtf8("LINK"), Side.SELL, 5, 4, {
      from: accounts[0],
    });

    let orderBook = await dex.getOrderBook(
      web3.utils.fromUtf8("LINK"),
      Side.SELL
    );
    // let orderBook = [5, 20, 30];
    assert(orderBook.length > 0);

    for (let i = 0; i < orderBook.length - 1; i++) {
      console.log("i: " + i);
      for (let j = i + 1; j < orderBook.length; j++) {
        console.log("j: " + j);
        assert(orderBook[i] < orderBook[j]);
      }
    }
  });
});
