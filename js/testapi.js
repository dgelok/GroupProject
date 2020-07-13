import {APIurls} from "./apikeys.js"
$(()=>{
    

// HOLDING CLASS TO CREATE INSTANCES WHEN STOCK IS PURCHASED
class Holding {
    
    constructor(name, symbol, totalShares){
        this.name = name;
        this.symbol = symbol;
        this.totalShares = totalShares;
        }
    
}

// USER CLASS FOR CREATING NEW USERS
class User{
    constructor(userName, cash,currentNetWorth, holdings = []){
        this.userName = userName;
        this.cash = cash;
        this.currentNetWorth = [currentNetWorth];
        this.holdings = holdings;
        this.currentStockAwaitingPurchase = {};
        
    }
    addStockToPurchaseList(name, symbol){
        this.currentStockAwaitingPurchase = {
            name : name,
            symbol : symbol,
        
        }
    }
    saveUser(){
        localStorage.setItem(`${this.userName}`, JSON.stringify(this))
    }
    createNewHolding(name, symbol, numShares){
        let found = false;
        for(let comp of this.holdings){
            if(symbol == comp.symbol){
                comp.totalShares += numShares
                console.log(comp.totalShares);
                found = true;
            }
        }
        if(found == false){
            let newHolding = new Holding(name,symbol,numShares)
            console.log(newHolding.totalShares);
            this.holdings.push(newHolding)
        }
       
    }
    async buyStock(name, symbol, numShares, latestPrice){
        let stockPrice = await latestPrice(symbol)
        console.log(typeof this.cash,typeof numShares, typeof stockPrice)
        if(this.cash >= numShares * stockPrice){
            console.log("Cash is enough to buy");
            console.log(this.cash);
            this.createNewHolding(name, symbol, numShares)
            
            this.cash = this.cash - (numShares * stockPrice)
            console.log(this.cash);
        }
        this.saveUser();
        
    }
    async getStockData(stockSymbol){
        let response = await fetch(`https://cloud.iexapis.com/stable/stock/${stockSymbol}/quote/?token=${APIurls[2]}`)
        let json = await response.json();
        return json;
    }
    async getStockLatestPrice(stockSymbol){
        let response = await fetch(`https://cloud.iexapis.com/stable/stock/${stockSymbol}/quote/?token=${APIurls[2]}`)
            let json = await response.json();
            console.log(json)
            let currentPrice = json.latestPrice;
            console.log(currentPrice);
            return currentPrice;
    }
    async getPortfolioData(){
        
        return Promise.all(this.holdings.map( comp => {
            return fetch(`https://cloud.iexapis.com/stable/stock/${comp.symbol}/quote/?token=${APIurls[2]}`).then(resp => resp.json())
        })).then(results => {
            let total = 0;
            let companyArray = []
         results.forEach((comp, index)=>{
             
             let currentCompInHoldings = this.holdings[index];
             let latestPrice = parseFloat(comp.latestPrice); 
             let totalSharesOfComp =  parseInt(currentCompInHoldings.totalShares);  
             total += (latestPrice * totalSharesOfComp);
             companyArray.push({
                 name : currentCompInHoldings.name,
                 totalSharesValue : (latestPrice * totalSharesOfComp)
                 
             })
        } )
         return {
            totalPortfolioValue : total + this.cash,
            companys : companyArray
         }
        })
        
    }
  
    async getData(){
        $("#tbody").html("")
        $("#tbody").append(`
        <tr id="cashTableData">
        <td>Cash</td>
        <td></td>
        <td></td>
        <td>$${this.cash.toFixed(2)}</td>
        </tr>
        `)
       let totalPortfolioValue = this.cash;
       
       Promise.all(this.holdings.map( comp => {
           return fetch(`https://cloud.iexapis.com/stable/stock/${comp.symbol}/quote/?token=${APIurls[2]}`).then(resp => resp.json())
       })).then(results => {
        //    console.log(results);
        results.forEach((comp, index)=>{
            
            let currentCompInHoldings = this.holdings[index];
            
                $('#totalPortfolioValue').html(`
                Portfolio Value: $${(totalPortfolioValue += (comp.latestPrice * currentCompInHoldings.totalShares)).toFixed(2)}
            `)
            $("#tbody").append(`
            <tr>
            
            <td>${currentCompInHoldings.name} (${currentCompInHoldings.symbol})</td>
            <td>${Number(currentCompInHoldings.totalShares)}</td>
            <td>$${Number(comp.latestPrice).toFixed(2)}</td>
            <td>$${(Number(comp.latestPrice) * Number(currentCompInHoldings.totalShares)).toFixed(2)}</td>
          </tr>
            `)
           
        })
       })

    }

 
}
  
  

//CREATING NEW MOCK USER DATA
function createNewUser(userName){
    let newUser = new User(userName,10000,10000)
    if(localStorage.getItem(userName) == null){
        localStorage.setItem(`${newUser.userName}`, JSON.stringify(newUser))
        return newUser;
        
    }else{
       
        return getUser(userName);

    }
    
}


function getUser(userName){
    let parsedUserObj = JSON.parse(localStorage.getItem(userName))
    let userCash = Number(parsedUserObj.cash)
    let user = parsedUserObj.userName
    let userCurrentNetWorth = parsedUserObj.currentNetWorth
    let userCurrentHoldings = parsedUserObj.holdings
    let currentUser = new User(user,userCash,userCurrentNetWorth,userCurrentHoldings)

    return currentUser;
}

let currentUser = createNewUser(localStorage.currentUser);
currentUser.getData()


$("#refreshButton").click(function(e){
    currentUser.getData();
 })


 // Checkout Function
$("#nameList").click(function(e){
    (async () => {
    let stockData = await currentUser.getStockData(e.target.id);
    let currentShares = 0;
    $("#checkoutTable").show();
    $("#companyNameAndSymbolCheckoutTable").html(`${stockData.companyName}(${stockData.symbol})`)
    $("#currentSharePrice").html(`${stockData.latestPrice}`)
    for(let comp of currentUser.holdings){
        if(comp.symbol == stockData.symbol){
            currentShares = comp.totalShares;
        }
    }
    $("#userCurrentSharesCheckoutTable").html(`${currentShares}`)
    $("#exampleModalCenterTitle2").html(`Purchase shares of ${stockData.companyName} <br> for $<span>${stockData.latestPrice}</span> a share`)
    currentUser.addStockToPurchaseList(stockData.companyName,stockData.symbol)
    $("#currentCashCheckoutField").html(`$${currentUser.cash.toFixed(2)}`)
    $("#totalCashRemaining").html(`$${currentUser.cash.toFixed(2)}`)
    })()
    

})

$("#checkoutBuyButton").click(function(e){
    let stockName = currentUser.currentStockAwaitingPurchase.name;
    let stockSymbol = currentUser.currentStockAwaitingPurchase.symbol;
    
    let sharesToBuy = Number($("#numSharesToPurchaseField").val());
    $("#buyConfirmationMessage").html(`You purchased ${sharesToBuy} shares of ${stockName}!`)
    console.log(sharesToBuy);
   currentUser.buyStock(stockName, stockSymbol, sharesToBuy, currentUser.getStockLatestPrice)
})

// $('#exampleModalCenter2').on('shown.bs.modal', function (e) {
    
//         let stockData = awacurrentUser.getStockData(e.target.id);
//         console.log(stockData);
//         $("#exampleModalCenterTitle2").html(`Purchase shares of ${stockData.companyName} at $${stockData.latestPrice} a share`)
  
//   })

// $("#buySharesFinalButton").click(function(e){
//     console.log(e);
//         // let stockData = await currentUser.getStockData(e.target.id);
//         // console.log(stockData);
       
//         $("#exampleModalCenterTitle").html(`Purchase shares of  a share`)
  
// })













//   $("#nameList").click(function(e){
//       console.log(e.target.id)
//       let stockSymbol = e.target.id
//       Promise.all([fetch(`https://cloud.iexapis.com/stable/stock/${stockSymbol}/company/?token=${APIurls[2]}`),
//       fetch(`https://cloud.iexapis.com/stable/stock/${stockSymbol}/quote/?token=${APIurls[2]}`)])
//       .then(results => {
//         return Promise.all(results.map(response => response.json()))
          
//         })
//       .then(json => {
//           console.log(json[0])
//           console.log(json[1])
//              console.log(json[0].companyName)
//              console.log(json)
//              console.log(json[1].latestPrice)
//             $("#companyDataContainer").append(
//             `<button id="buyButton">Buy Stock</button>
//             <h3>${json[0].companyName}</h3>
//             <span id="stockPrice">Latest Stock Price: ${json[1].latestPrice}</span>
//             <br><br>    
//             <h6>Company Description</h6>
//             <p>${json[0].description}</p>
            
//             `)
//             $("#buyButton").click(function(){
            
//                 $("#companyDataContainer").html(`
//                 Comapny: ${json[0].companyName} Price Per Share: ${json[1].latestPrice}
//                 How many shares would you like to purchase
//                   <input type="text" id="numSharesTextField"><button id="buyShares">Buy Shares</button> 
//                 `)
//                 $("#buyShares").click(function(){
//                     let numPurchasedShares = Number($("#numSharesTextField").val());
//                     currentUser.createNewHolding(json[0].companyName,stockSymbol, numPurchasedShares)
//                     currentUser.saveUser();
//                     //currentUser.getData();
                    
//                 })

//             })
            



        

        // Calls setINterval function to update Latest Stock Price
        setInterval(() => {
            fetch(`https://cloud.iexapis.com/stable/stock/${json[1].symbol}/quote/?token=${APIurls[2]}`)
            .then(response => response.json())
            .then(json => {
                console.log(json.latestPrice)
                console.log(json.companyName)
                $("#stockPrice").html(`Latest Stock Price: ${json.latestPrice}`) ;
            })
            }, 500000)

   
//   })

//   function getCurrentStockPrice(symbol){
//     fetch(`https://cloud.iexapis.com/stable/stock/${symbol}/quote/?token=${APIurls[2]}`)
//     .then(response => response.json())
//     .then(json => {
//         console.log(json.latestPrice)
//         return json.latestPrice;
        
    let notAbleToBuy = $("#overPurchaseWarningMessage").is(":visible");
    if(notAbleToBuy){
        return
    }else{
        let stockName = currentUser.currentStockAwaitingPurchase.name;
        let stockSymbol = currentUser.currentStockAwaitingPurchase.symbol;
        
        let sharesToBuy = Number($("#numSharesToPurchaseField").val());
        $("#successPurchaseMessage").html(`You purchased ${sharesToBuy} shares of ${stockName}!`)
        $("#successPurchaseMessage").show();
       currentUser.buyStock(stockName, stockSymbol, sharesToBuy, currentUser.getStockLatestPrice)
    }


$("#numSharesToPurchaseField").keyup(function(e){
    
    let numSharesToPurchase = Number($("#numSharesToPurchaseField").val()).toFixed(0);
    let latestPrice = Number($("#exampleModalCenterTitle2 span").html()).toFixed(2);
    let total = Number(numSharesToPurchase) * Number(latestPrice);
    let cashRemaining = Number(currentUser.cash - total).toFixed(2);
    if(cashRemaining <= 0){
        $("#overPurchaseWarningMessage").show();
    }else{
        $("#overPurchaseWarningMessage").hide();
    }
    
    $("#totalSharesWantingToPurchase").html(`${numSharesToPurchase} X ${latestPrice}`);
    $("#totalSharePurchasePrice").html(`$${total.toFixed(2)}`)
    $("#totalCashRemaining").html(`$${cashRemaining}`)

})

$("#goHome").click(function(e){
    window.location.href = "dashboard.html";
})



// Create line graph
async function createLineGraph(){
    let currentPortfolioData = await currentUser.getPortfolioData();
    let totalPortfolioValue = currentPortfolioData.totalPortfolioValue;
    let compNames = currentPortfolioData.companys.map(comp => comp.name)
    let compPercentages = currentPortfolioData.companys.map(comp => ((comp.totalSharesValue / totalPortfolioValue) * 100).toFixed(2))
    let moreColors = ["#FFEC21","#378AFF","#FFA32F","#F54F52","#93F03B","#9552EA","#5DADEC","#FF007C"]
    const ctx = document.getElementById('myChart').getContext('2d');
    const ctx2 = document.getElementById('myPie').getContext('2d');
 const chart = new Chart(ctx, {
    // The type of chart we want to create
    type: 'line',

    // The data for our dataset
    data: {
        labels: ['Day 1', 'Today'],
        datasets: [{
            label: 'Portfolio Value',
            backgroundColor: 'blue',
            borderColor: 'blue',
            data: [10000, totalPortfolioValue],
            fill: false
        }]
    },

    // Configuration options go here
    options: {
        scales: {
            yAxes: [{
                ticks: {
                    // Include a dollar sign in the ticks
                    callback: function(value, index, values) {
                        return '$' + value;
                    }
                }
            }]
        },
        title: {
            display: true,
            text: 'Change in Portfolio Value'
        }
    }
});

const pie = new Chart(ctx2, {
    // The type of chart we want to create
    type: 'pie',

    // The data for our dataset
    data: {
        labels: [...compNames,"Cash"],
        datasets: [{
            label: 'Portfolio Value',
            backgroundColor: moreColors,
            data: [...compPercentages, ((currentUser.cash/totalPortfolioValue) *100).toFixed(2)],
            fill: false
        }]
    },

    // Configuration options go here
    options: {
        title: {
            display: true,
            text: 'Percentages of Total Portfolio'
        },
        legend: {
            display: true,
            labels: {
                
            }
        },
        
    }
});



}
createLineGraph()


})
