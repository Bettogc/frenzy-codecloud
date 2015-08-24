/* This function permit sort an list and count the times
that appear one value inside of a list an return one object */
function orderArray(array) {
    /* save the value like key and the times that appear like a number */
    var totalPromotion = {};
    /* Save previous value to compare if this don't exist*/
    var prev;
    array.sort();
    
    /* This for permit to parse the array */
    for (var i = 0; i < array.length; i++) {
        
        /* Compare if valo in array[i} is diferent to previos value save in prev
        if this don't exit create key and item but if exist only sum one more */ 
        if ( array[i] != prev ) {
            totalPromotion[array[i]] = 1;
        } else {
            totalPromotion[array[i]] += 1;
        }
        prev = array[i];

    };
    
    /* Return sort object */
    return totalPromotion
};


/*This functions returns an array with the name of promotions and customers*/
Parse.Cloud.define("GetPromotions", function(request, response) {
    /* Crate query for search promotions */ 
    var promotion = new Parse.Query('Promotion');
    
    /* This object is to save the list of clients for each promotions*/
    var costumerQuantityPromotions = [];
    
    /* Whit this find we can call all data in Promotions Table */
    promotion.find().then(function(results) {
        for (x in results) {
            /* clientList save the list of costumers for each promotions in an array */
            var clientList = results[x].attributes.Costumer;
            costumerQuantityPromotions.push(clientList);
        };
        
        /* Return Arrey with list of costumer */
        response.success(costumerQuantityPromotions);
    });
});

/*Sort data in an array for each costumer with your quantity promotions*/
Parse.Cloud.define("GetQuantityPromotions", function(request, response) {
    /* Save parameter in promotions */
    promotions = request.params.Array
    var clientList = [];
    
    /* This object is to save Quantity of promotios by Costumer */
    var quantityPromotionsCustomer = {"Quantities":[]};

    /* This for is for to parse all array inside of promotions*/
    for (var i = 0; i<promotions.length; i++) {
        var Data;
        /* save array in position "i" */
        Data = promotions[i];
        /* This for is for to parse each item inside of Data*/
        for (var x = 0; x<Data.length; x++) {
            /* Save each item in clienteList*/
            clientList.push(Data[x]);
        };
    };
    
    /* Call orderArray function with client list like parameter and save response in
    quantityAndAverege object */
    quantityPromotionsCustomer.Quantities.push(orderArray(clientList));
    
    response.success(quantityPromotionsCustomer);
});


Parse.Cloud.define("GetAverageSavings", function(request,response) {
    /* Save parameter in quantityAndAverage */
    quantityAndAverage = request.params.Array;
    
    /* Add a new id insede of quantityAndAverage for save averages by costumer*/
    quantityAndAverage["averageSavingsCostumer"] = {}
    
    /* Crate query for search promotions */
    var promotion = new Parse.Query('Promotion');
    
    /* This array seve the list off BasePrices and PromotionalPrices by Costumer  */
    var costumerPrices = {};
    costumerPrices["pricesList"] = {};

    /* Whit this find we can call all data in Promotions Table */
    promotion.find().then(function(results) {
        /* Iterates in names of costumers in quantityAndAverage.Quantities */
        for (i in quantityAndAverage.Quantities[0]) {
            /* Iterates in Promotions table */
            for (x in results) {
                /* Save the list of costomer for each promotion */
                var costumerList = results[x].attributes.Costumer
                /* Verify if costumer exist inside of costumerList */
                if(costumerList.indexOf(i)!= -1) {
                    var basePrice = results[x].attributes.BasePrice;
                    var promotionalPrice = results[x].attributes.PromotionalPrice;
                    /* If don't exist create a new id and save data if exist onle add data. */
                    if (!(i in costumerPrices.pricesList)) {
                        costumerPrices.pricesList[i] = {};
                        costumerPrices.pricesList[i]["BasePrice"] = [];
                        costumerPrices.pricesList[i].BasePrice.push(basePrice);
                        
                        costumerPrices.pricesList[i]["PromotionalPrice"] = [];
                        costumerPrices.pricesList[i].PromotionalPrice.push(promotionalPrice);
                    } else {
                        costumerPrices.pricesList[i].BasePrice.push(basePrice);
                        costumerPrices.pricesList[i].PromotionalPrice.push(promotionalPrice);
                    };
                };
            };
        };
        
        /* Iterates in costumersPrices for calculate the avarege savings */
        for (y in costumerPrices.pricesList) {
            
            /* Save and sum all values in the BasePrice list */
            var sumBasePrice = costumerPrices.pricesList[y].BasePrice.reduce( function(a,b) {
                return a + b;
            },0);
            
            /* Save and sum all values in the PromotionalPrice list */
            var sumPromotionalPrice = costumerPrices.pricesList[y].PromotionalPrice.reduce( function(a,b) {
                return a + b;
            },0);
            
            /* Save length of prices list */
            var lengthPrices = costumerPrices.pricesList[y].BasePrice.length;
            
            /* Calculate the average savings */
            var average = (sumBasePrice-sumPromotionalPrice)/lengthPrices;
            
            /* Save in the principal object! */
            quantityAndAverage.averageSavingsCostumer[y] = average.toFixed(2);
        }
        
        /* Return Arrey with list of costumer with each count promotions by costumer and
        your average savings*/
        response.success(quantityAndAverage);
    });
});


function saveFavorite (FavoriteID, UserID, CustomerID) {
    /* Create connection to favorite class in parse */
    var FavoriteClass = Parse.Object.extend("Favorite");
    var FavoriteUser = new FavoriteClass();

    /* Null is to verify if user doesn't exist and add user to data base */
    if (FavoriteID === null) {
        FavoriteUser.set("UserID",UserID);
        FavoriteUser.add("CustomerID",CustomerID);
        return FavoriteUser.save(null,{
            success:function(FavoriteUser) { 
                response.success("User created in favorites and favorite added.");
            },
            error:function(error) {
                response.error(error);
            }
        });
    } else {
        /* If user exist, only add favorite, to array of user */
        FavoriteUser.id = FavoriteID;
        FavoriteUser.set("UserID",UserID);
        FavoriteUser.add("CustomerID",CustomerID);
        FavoriteUser.save(null,{
            success:function(FavoriteUser) { 
                response.success("Favorite added to user.");
            },
            error:function(error) {
                response.error(error);
            }
        });
    };
}

/*This functions permit save data in Favoritos Class*/
Parse.Cloud.define("SaveFavorite", function(request, response) {
    /*Variable to save parameters*/
    Data = request.params.Array;

    /*FavoriteData save all data in favorite class*/
    var FavoriteData = Parse.Object.extend("Favorite");
    var query = new Parse.Query(FavoriteData);
    /*only call data to specific user*/
    query.equalTo("UserID", Data.UserID);

    query.find({
        success: function(results) {
            /*if length is greater that 0 the user exist*/
            if (results.length > 0) {
                /*Edit user*/
                response.success(saveFavorite(results[0].id,Data.UserID,Data.CustomerID));
            } else {
                /*Save new user*/
                response.success(saveFavorite(null,Data.UserID,Data.CustomerID));
            };

        },
        error: function(error) {
            response.error(error);
        }
    });
});

Parse.Cloud.define("DeleteFavorite",function(request,response){
    /*Variable to save parameters*/
    Data = request.params.Array;

    /*FavoriteData save all data in favorite class*/
    var FavoriteData = Parse.Object.extend("Favorite");
    var query = new Parse.Query(FavoriteData);

    /*only call data to specific user*/
    query.equalTo("UserID", Data.UserID);

    query.each(function(results) {
        {
            /* This for loop is to iterate inside of customerID array */
            for(var i = 0; i < results.attributes.CustomerID.length; i++){
                /* If item in array is equal to send for user is deleted */
                if (results.attributes.CustomerID[i] == Data.CustomerID) {
                    results.attributes.CustomerID.splice(i,1);
                    /* Save data en Data base of parse */
                    results.save();
                }
            };
            response.success("Favorite Removed");
        }
    });
});

function savePromotion (FavoriteID, UserID, PromotionID) {
    /* Create connection to PromotionSaved class in parse */
    var FavoriteClass = Parse.Object.extend("PromotionSaved");
    var FavoriteUser = new FavoriteClass();

    /* Null is to verify if user doesn't exist and add user to data base */
    if (FavoriteID === null) {
        FavoriteUser.set("UserID",UserID);
        FavoriteUser.add("PromotionID",PromotionID);
        return FavoriteUser.save(null,{
            success:function(FavoriteUser) { 
                response.success("User created in PromotionSaved and promotion added.");
            },
            error:function(error) {
                response.error(error);
            }
        });
    } else {
        /* If user exist, only add favorite promotion, to array of user */
        FavoriteUser.id = FavoriteID;
        FavoriteUser.set("UserID",UserID);
        FavoriteUser.add("PromotionID",PromotionID);
        FavoriteUser.save(null,{
            success:function(FavoriteUser) { 
                response.success("Favorite added to user.");
            },
            error:function(error) {
                response.error(error);
            }
        });
    };
}

/*This functions permit save data in Promotion Class*/
Parse.Cloud.define("SavePromotion", function(request, response) {
    /*Variable to save parameters*/
    Data = request.params.Array;

    /*promotionSavedData save all data in PromotionSaved class*/
    var promotionSavedData = Parse.Object.extend("PromotionSaved");
    var query = new Parse.Query(promotionSavedData);
    /*only call data to specific user*/
    query.equalTo("UserID", Data.UserID);

    query.find({
        success: function(results) {
            /*if length is greater that 0 the user exist*/
            if (results.length > 0) {
                /*Edit user*/
                response.success(savePromotion(results[0].id,Data.UserID,Data.PromotionID));
            } else {
                /*Save new user*/
                response.success("No existe!!!!");
            };
        },
        error: function(error) {
            response.error(error);
        }
    });
});