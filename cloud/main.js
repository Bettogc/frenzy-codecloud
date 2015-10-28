Parse.Cloud.beforeSave(Parse.User, function(request, response) {
    var user = request.object;
    if (Parse.FacebookUtils.isLinked(user)) {
        Parse.Cloud.httpRequest({
            url: 'https://graph.facebook.com/me?fields=email,name,birthday,hometown&access_token='+user.get('authData').facebook.access_token
        }).then(function(httpResponse) {
            // Succesfully got FB user info
            var json = JSON.parse(httpResponse.text);
            request.object.set("name", String(json.name));
            request.object.set("birthday", String(json.birthday));
            request.object.set("hometown", json.hometown);
            response.success();
        }, function(httpResponse) {
            // Error pulling user info from FB
            response.error("There was a problem logging into Facebook. Please try again later.");
        });
    }
});

Parse.Cloud.afterSave(Parse.User, function(request, response) {
    var user = request.object;
    if (request.user.get('authData') != {}){
        var fb_auth = request.user.get('authData')['facebook'];
        var email;
        Parse.Cloud.httpRequest({
            method: "GET",
            url: "https://graph.facebook.com/" + fb_auth['id'] + "?fields=email&access_token=" + fb_auth['access_token'],
            success: function(httpResponse) {
                email = httpResponse.data['email'];
                Parse.Cloud.useMasterKey();
                user.setEmail(email, {});
                user.save();
            },
            error: function(httpResponse) {
                console.log('error');
            }
        });
    }
});

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
    var customerQuantityPromotions = [];

    /* Whit this find we can call all data in Promotions Table */
    promotion.find().then(function(results) {
        for (x in results) {
            if (results[x].attributes.Status === true) {
                /* clientList save the list of customers for each promotions in an array */
                var clientList = results[x].attributes.Customer;
                customerQuantityPromotions.push(clientList);
            };
        };

        /* Return Array with list of customer */
        response.success(customerQuantityPromotions);
    });
});

/*Sort data in an array for each customer with your quantity promotions*/
Parse.Cloud.define("GetQuantityPromotions", function(request, response) {
    /* Save parameter in promotions */
    promotions = request.params.Array
    var clientList = [];

    /* This object is to save Quantity of promotios by customer */
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

    /* Add a new id insede of quantityAndAverage for save averages by customer*/
    quantityAndAverage["averageSavingscustomer"] = {}

    /* Crate query for search promotions */
    var promotion = new Parse.Query('Promotion');

    /* This array seve the list off BasePrices and PromotionalPrices by customer  */
    var customerPrices = {};
    customerPrices["pricesList"] = {};

    /* Whit this find we can call all data in Promotions Table */
    promotion.find().then(function(results) {
        /* Iterates in names of customers in quantityAndAverage.Quantities */
        for (i in quantityAndAverage.Quantities[0]) {
            /* Iterates in Promotions table */
            for (x in results) {
                if (results[x].attributes.Status === true) {
                    /* Save the list of customer for each promotion */
                    var customerList = results[x].attributes.Customer
                    /* Verify if customer exist inside of customerList */
                    if(customerList.indexOf(i)!= -1) {
                        var basePrice = results[x].attributes.BasePrice;
                        var promotionalPrice = results[x].attributes.PromotionalPrice;
                        /* If don't exist create a new id and save data if exist onle add data. */
                        if (!(i in customerPrices.pricesList)) {
                            customerPrices.pricesList[i] = {};
                            customerPrices.pricesList[i]["BasePrice"] = [];
                            customerPrices.pricesList[i].BasePrice.push(basePrice);

                            customerPrices.pricesList[i]["PromotionalPrice"] = [];
                            customerPrices.pricesList[i].PromotionalPrice.push(promotionalPrice);
                        } else {
                            customerPrices.pricesList[i].BasePrice.push(basePrice);
                            customerPrices.pricesList[i].PromotionalPrice.push(promotionalPrice);
                        };
                    };
                };
            };
        };

        /* Iterates in customersPrices for calculate the avarege savings */
        for (y in customerPrices.pricesList) {

            /* Save and sum all values in the BasePrice list */
            var sumBasePrice = customerPrices.pricesList[y].BasePrice.reduce( function(a,b) {
                return a + b;
            },0);

            /* Save and sum all values in the PromotionalPrice list */
            var sumPromotionalPrice = customerPrices.pricesList[y].PromotionalPrice.reduce( function(a,b) {
                return a + b;
            },0);

            /* Save length of prices list */
            var lengthPrices = customerPrices.pricesList[y].BasePrice.length;

            /* Calculate the average savings */
            var average = (sumBasePrice-sumPromotionalPrice)/lengthPrices;

            /* Save in the principal object! */
            quantityAndAverage.averageSavingscustomer[y] = average.toFixed(2);
        }

        /* Return Array with list of customer with each count promotions by customer and
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
        /* If user exist, only add favorite customer, to array of user */
        FavoriteUser.id = FavoriteID;
        FavoriteUser.set("UserID",UserID);
        FavoriteUser.add("CustomerID",CustomerID);
        return FavoriteUser.save(null,{
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
        return FavoriteUser.save(null,{
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
                response.success(savePromotion(null,Data.UserID,Data.PromotionID));
            };
        },
        error: function(error) {
            response.error(error);
        }
    });
});

Parse.Cloud.define("DeletePromotion",function(request,response){
    /*Variable to save parameters*/
    Data = request.params.Array;

    /*promotionSavedData save all data in PromotionSaved class*/
    var promotionSavedData = Parse.Object.extend("PromotionSaved");
    var query = new Parse.Query(promotionSavedData);

    /*only call data to specific user*/
    query.equalTo("UserID", Data.UserID);

    query.each(function(results) {
        {
            /* This for loop is to iterate inside of promotionID array */
            for(var i = 0; i < results.attributes.PromotionID.length; i++){
                /* If item in array is equal to send for user is deleted */
                if (results.attributes.PromotionID[i] == Data.PromotionId) {
                    results.attributes.PromotionID.splice(i,1);
                    /* Save data en Data base of parse */
                    results.save();
                }
            };
            response.success("Favorite Promotion Removed to PromotionSaved class");
        }
    });
});

function saveCupon (FavoriteID, UserID, CuponID) {
    /* Create connection to PromotionSaved class in parse */
    var FavoriteClass = Parse.Object.extend("PromotionSaved");
    var FavoriteUser = new FavoriteClass();

    /* Null is to verify if user doesn't exist and add user to data base */
    if (FavoriteID === null) {
        FavoriteUser.set("UserID",UserID);
        FavoriteUser.add("CuponID",CuponID);
        return FavoriteUser.save(null,{
            success:function(FavoriteUser) {
                response.success("User created in PromotionSaved and cupon added.");
            },
            error:function(error) {
                response.error(error);
            }
        });
    } else {
        /* If user exist, only add favorite promotion, to array of user */
        FavoriteUser.id = FavoriteID;
        FavoriteUser.set("UserID",UserID);
        FavoriteUser.add("CuponID",CuponID);
        return FavoriteUser.save(null,{
            success:function(FavoriteUser) {
                response.success("Favorite cumpon added to user.");
            },
            error:function(error) {
                response.error(error);
            }
        });
    };
}

/*This functions permit save data in PromotionSaved Class*/
Parse.Cloud.define("saveFavoriteCupon", function(request, response) {
    /*Variable to save parameters*/
    Data = request.params.Array;

    /*promotionSavedData save all data in PromotionSaved class*/
    var cuponSavedData = Parse.Object.extend("PromotionSaved");
    var query = new Parse.Query(cuponSavedData);

    /*only call data to specific user*/
    query.equalTo("UserID", Data.UserID);

    query.find({
        success: function(results) {
            /*if length is greater that 0 the user exist*/
            if (results.length > 0) {
                /*Edit user*/
                response.success(saveCupon(results[0].id,Data.UserID,Data.CuponID));
            } else {
                /*Save new user*/
                response.success(saveCupon(null,Data.UserID,Data.CuponID));
            };
        },
        error: function(error) {
            response.error(error);
        }
    });
});

Parse.Cloud.define("deleteFavoriteCupon",function(request,response){
    /*Variable to save parameters*/
    Data = request.params.Array;

    /*promotionSavedData save all data in PromotionSaved class*/
    var promotionSavedData = Parse.Object.extend("PromotionSaved");
    var query = new Parse.Query(promotionSavedData);

    /*only call data to specific user*/
    query.equalTo("UserID", Data.UserID);

    query.each(function(results) {
        {
            /* This for loop is to iterate inside of CuponID array */
            for(var i = 0; i < results.attributes.CuponID.length; i++){
                /* If item in array is equal to send for user is deleted */
                if (results.attributes.CuponID[i] == Data.CuponID) {
                    results.attributes.CuponID.splice(i,1);
                    /* Save data en Data base of parse */
                    results.save();
                }
            };
            response.success("Favorite Promotion Removed to PromotionSaved class");
        }
    });
});
