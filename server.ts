const express = require('express');

//setting up mongoose
const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/', {useNewUrlParser: true, useUnifiedTopology: true});
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("Database is connected!");
});
let cachedValueSchema = new mongoose.Schema({
  title: String,
  value: Number,
  date: {type: Date, default: Date.now}
});
let cachedValue = mongoose.model('cachedValue', cachedValueSchema);

//setting up express
let app = express();
const port = process.env.PORT || 8001;

//setting up neutrino api
const explorerApi = require('./api/ExplorerApi.ts');
const neutrinoContractAddress = "3PC9BfRwJWWiw9AREE2B3eWzCks3CYtg4yo";
const nodeUrl = "http://nodes.wavesnodes.com/";

// Helper Functions
async function connectExplorerApi(nodeUrl, neutrinoContractAddress){
  try {
    return await explorerApi.ExplorerApi.create(nodeUrl, neutrinoContractAddress);
  } catch(error){
    console.log(error);
  }
}
/*
let explorerApiObject;
(async function (){
  explorerApiObject = await connectExplorerApi(nodeUrl, neutrinoContractAddress);
})();
*/

// -------------------
app.get('/api/get_current_price', async (req, res) => {
  try {
    let result = [];
    await cachedValue.findOne({ title: "deficit" }).sort({ date: -1 }).exec((err, data) => {
      if (err) {
        console.log(err);
      } else {
        console.log(data);
        result.push(data.value);

        console.log("Result:",result[0]);
        res.status(200).send(result[0].toString());
      }
    });
  }
  catch(error){
    console.log(error);
    res.sendStatus(500);
  }
});

// app.get('/api/get_current_balance', async (req, res) => {
//   try {
//     let result = await explorerApiObject.getBalance();
//
//     res.status(200).send(result.toString());
//   }
//   catch(error){
//     console.log(error);
//     res.sendStatus(500);
//   }
// });
//
// app.get('/api/get_total_issued', async (req, res) => {
//   try {
//     let result = await explorerApiObject.getTotalIssued();
//
//     res.status(200).send(result.toString());
//   }
//   catch(error){
//     console.log(error);
//     res.sendStatus(500);
//   }
// });
//
// app.get('/api/get_staked', async (req, res) => {
//   try {
//     let result = await explorerApiObject.getStaked();
//
//     res.status(200).send(result.toString());
//   }
//   catch(error){
//     console.log(error);
//     res.sendStatus(500);
//   }
// });
//
// app.get('/api/get_annual_yield', async (req, res) => {
//   try {
//     let result = await explorerApiObject.getAnnualYield();
//
//     res.status(200).send(result.toString());
//   }
//   catch(error){
//     console.log(error);
//     res.sendStatus(500);
//   }
// });
//
// app.get('/api/get_circulating_supply', async (req, res) => {
//   try {
//     let result = await explorerApiObject.getCirculatingSupply();
//
//     res.status(200).send(result.toString());
//   }
//   catch(error){
//     console.log(error);
//     res.sendStatus(500);
//   }
// });
//
// app.get('/api/get_deficit', async (req, res) => {
//   try {
//     let deficit = await explorerApiObject.getDeficit();
//
//     res.status(200).send(deficit.toString());
//   }
//   catch(error){
//     console.log(error);
//     res.sendStatus(500);
//   }
// });
//
// app.get('/api/get_decimals', async (req, res) => {
//   try {
//     let result = await explorerApiObject.getDecimals();
//
//     res.status(200).send(result.toString());
//   }
//   catch(error){
//     console.log(error);
//     res.sendStatus(500);
//   }
// });
//
// app.get('/api/get_circulating_supply_no_dec', async (req, res) => {
//   try {
//     let result = await explorerApiObject.getCirculatingSupplyNoDec();
//
//     res.status(200).send(result.toString());
//   }
//   catch(error){
//     console.log(error);
//     res.sendStatus(500);
//   }
// });
//
// app.get('/api/get_price_blocks', async (req, res) => {
//   try {
//     let start = req.query.start;
//     let end = req.query.end;
//
//     let result = await explorerApiObject.getPriceBlocks(start,end);
//
//     res.setHeader('Content-Type', 'application/json');
//
//     res.status(200).send(JSON.stringify(result));
//   }
//   catch(error){
//     console.log(error);
//     res.sendStatus(500);
//   }
// });

app.get('/api/test', async (req, res) => {
  try {
    let deficit = await explorerApiObject.getDeficit();

    // remove all
    // cachedValue.deleteMany({},function(err){
    //   if (err){
    //     console.log(err);
    //   }
    // });

    let newCachedValue = new cachedValue({
      title: "deficit",
      value: deficit
    });
    //
    newCachedValue.save(function(err,newCachedValue){
      if (err) return console.error(err);
      console.log("Done");
    });
    //
    // cachedValue.find().sort({ date: -1 }).exec((err, data) => {
    //   if (err) return console.error(err);
    //   console.log(data);
    // });

    cachedValue.find().exec((err, data) => {
      if (err) return console.error(err);
      console.log(data);
    });
    res.status(200).send(deficit.toString());
  }
  catch(error){
    console.log(error);
    res.sendStatus(500);
  }
});

async function removeAllFromDB(model){
    model.deleteMany({},function(err){
      if (err){
        console.log(err);
      }
    });
}

async function updateDB(title,fnc){
  try {
    console.log(fnc);
    let value = await fnc();

    let newCachedValue = new cachedValue({
      title: title,
      value: value
    });

    newCachedValue.save(function(err,newCachedValue){
      if (err) return console.error(err);
      console.log("Done");
    });

  } catch(error){
    console.log(error);
  }
}

let explorerApiObject;
(async function (){
  try {
    const explorerApiObject = await explorerApi.ExplorerApi.create(nodeUrl, neutrinoContractAddress);
    await updateDB("price",explorerApiObject.getPrice);
  }
  catch(error){
    console.log(error);
  }
})();

//Listener
let server = app.listen(port, async function () {
     console.log("Running express-api on port " + port);
});
