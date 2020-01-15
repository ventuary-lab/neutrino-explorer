const express = require('express');
import { plot, Plot } from 'nodeplotlib';


//setting up mongoose
const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/', {useNewUrlParser: true, useUnifiedTopology: true});
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("Database is connected");
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
async function removeAllFromDB(model){
    model.deleteMany({},function(err){
      if (err){
        console.log(err);
      }
    });
}

async function updateDB(title,value){
  try {
    let newCachedValue = new cachedValue({
      title: title,
      value: value
    });

    newCachedValue.save(function(err,newCachedValue){
      if (err) return console.error(err);
      console.log("Saved newCachedValue in DB");
    });

  } catch(error){
    console.log(error);
  }
}

async function connectExplorerApi(nodeUrl, neutrinoContractAddress){
  try {
    return await explorerApi.ExplorerApi.create(nodeUrl, neutrinoContractAddress);
  } catch(error){
    console.log(error);
  }
}

async function findLastValue(title, cachedValue, res){
  try {
    let result = [];
    await cachedValue.findOne({ title: title }).sort({ date: -1 }).exec((err, data) => {
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
}

let explorerApiObject;
(async function (){
  explorerApiObject = await connectExplorerApi(nodeUrl, neutrinoContractAddress);
})();


// -----------Database requests--------------
app.get('/api/get_current_price', async (req, res) => await findLastValue("price",cachedValue,res));
app.get('/api/get_current_balance', async (req, res) => await findLastValue("balance",cachedValue,res));
app.get('/api/get_total_issued', async (req, res) => await findLastValue("total_issued",cachedValue,res));
app.get('/api/get_staked', async (req, res) => await findLastValue("staked",cachedValue,res));
app.get('/api/get_annual_yield', async (req, res) => await findLastValue("annual_yield",cachedValue,res));
app.get('/api/get_circulating_supply', async (req, res) => await findLastValue("circulating_supply",cachedValue,res));
app.get('/api/get_deficit', async (req, res) => await findLastValue("deficit",cachedValue,res));
app.get('/api/get_circulating_supply_no_dec', async (req, res) => await findLastValue("circulating_supply_no_dec",cachedValue,res));


// ---------------node request api methods-------------------
app.get('/api/get_decimals', async (req, res) => {
  try {
    let result = await explorerApiObject.getDecimals();

    res.status(200).send(result.toString());
  }
  catch(error){
    console.log(error);
    res.sendStatus(500);
  }
});

// app.get('/api/get_historic_decimals', async (req, res) => {
//   try {
//     let result = await explorerApiObject.getHistoricDecimals();
//
//     res.status(200).send(result.toString());
//   }
//   catch(error){
//     console.log(error);
//     res.sendStatus(500);
//   }
// });

app.get('/api/get_price_blocks', async (req, res) => {
  try {
    let start = req.query.start;
    let end = req.query.end;

    let result = await explorerApiObject.getPriceBlocks(start,end);

    res.setHeader('Content-Type', 'application/json');

    res.status(200).send(JSON.stringify(result));
  }
  catch(error){
    console.log(error);
    res.sendStatus(500);
  }
});
// ----------------------------------------

//update database every minute
(async function (){
  try {
    const explorerApiObject = await connectExplorerApi(nodeUrl, neutrinoContractAddress);

    setInterval(async function(){
      console.log("Starting updating DB");
      let price = await explorerApiObject.getPrice();
      await updateDB("price",price);

      let balance = await explorerApiObject.getBalance();
      await updateDB("balance",balance);

      let total_issued = await explorerApiObject.getTotalIssued();
      await updateDB("total_issued",total_issued);

      let staked = await explorerApiObject.getStaked();
      await updateDB("staked",staked);

      let annual_yield = await explorerApiObject.getAnnualYield();
      await updateDB("annual_yield",annual_yield);

      let circulating_supply = await explorerApiObject.getCirculatingSupply();
      await updateDB("circulating_supply",circulating_supply);

      let deficit = await explorerApiObject.getDeficit();
      await updateDB("deficit", deficit);

      let circulating_supply_no_dec = await explorerApiObject.getCirculatingSupplyNoDec();
      await updateDB("circulating_supply_no_dec",circulating_supply_no_dec);
    }, 60*1000);

  }
  catch(error){
    console.log(error);
  }
})();

//Listener
let server = app.listen(port, async function () {
     console.log("Running express-api on port " + port);
});
