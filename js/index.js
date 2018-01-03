$(document).ready(function() {
  //  Instantiate IOTA with provider 'http://localhost:14265'
  // const provider = 'https://iotanode.us:443';
  const provider = 'http://node.lukaseder.de:14265';
  var iota = new IOTA({ provider });
  console.log('iota', iota);

  var seed;
  var address;
  var checkedTxs = 0;
  function toggleSidebar() {
    $(".button").toggleClass("active");
    $("main").toggleClass("move-to-left");
    $(".sidebar-item").toggleClass("active");
    $(".sidebar").toggleClass("donotdisplay");
  }
  //
  // Properly formats the seed, replacing all non-latin chars with 9's
  //
  function setSeed(value) {
    console.log('setSeed ran!')
    seed = "";
    value = value.toUpperCase();
    for (var i = 0; i < value.length; i++) {
      if (("9ABCDEFGHIJKLMNOPQRSTUVWXYZ").indexOf(value.charAt(i)) < 0) {
        seed += "9";
      } else {
        seed += value.charAt(i);
      }
    }
  }
  //
  //  Gets the addresses and transactions of an account
  //  As well as the current balance
  //  Automatically updates the HTML on the site
  //
  function getAccountInfo() {
    console.log('getAccountInfo ran!');
    // Command to be sent to the IOTA Node
    // Gets the latest transfers for the specified seed
    iota.api.getAccountData(seed, function(e, accountData) {
      console.log("Account data", accountData);
      // Update address in case it's not defined yet
      if (!address && accountData.addresses[0]) {
        address = iota.utils.addChecksum(accountData.addresses[accountData.addresses.length - 1]);
        updateAddressHTML(address);
      }
      var transferList = [];
      //  Go through all transfers to determine if the tx contains a message
      //  Only valid JSON data is accepted
      if (accountData.transfers.length > checkedTxs) {
        console.log("RECEIVED NEW TXS");
        accountData.transfers.forEach(function(transfer) {
          var message = iota.utils.extractJson(transfer);
          try {
            var message = iota.utils.extractJson(transfer);
            console.log("Extracted JSON from Transaction: ", message);
            message = JSON.parse(message);
            console.log("JSON: ", message);
            var newTx = {
              name: message.name,
              message: message.message,
              value: transfer[0].value
            }
            transferList.push(newTx);
          } catch (e) {
            console.log("Transaction did not contain any JSON Data")
          }
        })
        // Increase the counter of checkedTxs
        checkedTxs = accountData.transfers.length;
      }
      // If we received messages, update the leaderboard
      if (transferList.length > 0) {
        updateLeaderboardHTML(transferList);
      }
    })
  }
  //
  // Menu Open/Close
  //
  $(".button").on("click tap", function() {
    toggleSidebar();
  });
  //
  // Set seed
  //
  $("#seedSubmit").on("click", function() {
    // We modify the entered seed to fit the criteria of 81 chars, all uppercase and only latin letters
    setSeed($("#userSeed").val());
    // Then we remove the input
    $("#enterSeed").html('<div class="alert alert-success" role="alert">Successfully saved your seed. You can generate an address now.</div>');
    // We fetch the latest transactions every 90 seconds
    getAccountInfo();
    setInterval(getAccountInfo, 90000);
  });
  //
  // Generate a new address
  //
  $("#genAddress").on("click", function() {
    console.log('genAddress clicked!')
    if (!seed) {
      console.log("You did not enter your seed yet");
      return
    }
    // Deterministically generates a new address for the specified seed with a checksum
    iota.api.getNewAddress(seed, { checksum: true }, function(e, add) {
      console.log('getNewAddress ran after genAddress clicked!');
      if (e) {
        console.error(e);
      } else {
        console.log('add', add)
        console.log('address1', address)
        address = add;
        console.log('address2', address)
        updateAddressHTML(address);
        var transfer = [
          {
            address: address,
            value: 0,
            message: '',
            tag: ''
          }
        ]
        console.log('transfer[0].address', transfer[0].address)
        // Depth for the tip selection
        var depth = 4;
        // If we're on the mainnet, minWeightMagnitude is 18
        var minWeightMagnitude = 14;
        // Call the sendTransfer API wrapper function
        // It takes care prepareTransfers, attachToTangle, broadcast and storeTransactions
        iota.api.sendTransfer(seed, depth, minWeightMagnitude, transfer, function(e, attached) {
          console.log('sendTransfer ran after attachToTangle clicked!')
          if (e) {
            console.error(e)
          } else {
            console.log("Successfully attached your transaction to the Tangle with transaction", attached);
          }
        })
      }
    })
  })

});
