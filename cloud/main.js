Parse.Cloud.beforeSave(Parse.User, function(request, response) {
    var user = request.object;
     if (user.get('authData') != {}){
      if (Parse.FacebookUtils.isLinked(user)) {
          var keyaccess = user.get('authData').facebook.access_token
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
     }
    response.success(user);
});

Parse.Cloud.afterSave(Parse.User, function(request, response) {
    var user = request.object;
    if (user.get('authData') != {}){
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

        /* Compare if value in array[i} is diferent to previos value save in prev
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
          CustomerIDComparative = results[0].attributes.CustomerID;
          //CustomerIDComparative = CustomerIDComparative.toString();
            /*if length is greater that 0 the user exist*/
            if (results.length > 0) {
              /*Find the customer in favorite class to not repeat the save*/
              if(CustomerIDComparative.indexOf(Data.CustomerID) === -1){
                  /*Edit user*/
                  response.success(saveFavorite(results[0].id,Data.UserID,Data.CustomerID));
              } else {
                response.success("Ya existe como favorito")
              }
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
          PromotionIDComparative = results[0].attributes.PromotionID;
          /*if length is greater that 0 the user exist*/
          if (results.length > 0) {
            /*Find the promotionID in savePromotion class to not repeat the save*/
            if(PromotionIDComparative.indexOf(Data.PromotionID) === -1){
              /*Edit user*/
              response.success(savePromotion(results[0].id,Data.UserID,Data.PromotionID));
            } else {
              response.success("Ya existe como salvado");
            }
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

// This call to external library of moment-timezone.js for select a country time.
var moment = require('cloud/moment-timezone.js');
// Contain the countries with Date/Time
moment.tz.add(require('cloud/moment-timezone-with-data.js'));
// Add (Date/Time) Guatemala country
moment.tz.add('America/Guatemala|LMT CST CDT|62.4 60 50|0121212121|-24KhV.U 2efXV.U An0 mtd0 Nz0 ifB0 17b0 zDB0 11z0');
// This function and verifyFinalizedPromotions cloud define, disable promotion when the date promotion end.
function changeStatusPromotion(endHour,idPromo,actualHourCST) {
  var promotionClass = new Parse.Object.extend("Promotion");
    var promotionData = new promotionClass();
    var endDatePromotion = new Date(endHour);
    var actualHourGuatemala = new Date(actualHourCST);
    // Data validation (if actualHourGuatemala is major a endDatePromotion return false in status col in parse)
    if(actualHourGuatemala > endDatePromotion){
      promotionData.id = idPromo;
      promotionData.set("Status",false);
      promotionData.save();
    } else {
      promotionData.id = idPromo;
      promotionData.set("Status",true);
      promotionData.save();
    };
};

Parse.Cloud.job("verifyFinalizedPromotions", function (request, status) {
    // Connection with Hours Class for objectId
    var query = new Parse.Query('Promotion');
    // Take the Date of Guatemala City Country in long date
    var actualHour = moment().tz("America/Guatemala").format('LLL');
    query.equalTo("Status", true);

    // Find the endDate in Hour class ClassName
    query.find({
        success: function(results) {
            for (i in results) {
                // Take the actualHour variable for send to changeStatus function
                changeStatusPromotion(results[i].attributes.EndDate,results[i].id,actualHour);
            };
        },
        error: function(error){
            console.log(error);
        }
    }).then(function() {
        // Set the job's success status
        status.success("Verification completed successfully.");
    }, function(error) {
        // Set the job's error status
        status.error("Uh oh, something went wrong.");
    });;
});
// This function and verifyFinalizedCoupons cloud define, disable promotion when the date promotion end.
function changeStatusCoupons(endHour,idPromo,actualHourCST) {
  var couponClass = new Parse.Object.extend("Cupon");
    var couponData = new couponClass();
    var endDatePromotion = new Date(endHour);
    var actualHourGuatemala = new Date(actualHourCST);
    // Data validation (if actualHourGuatemala is major a endDatePromotion return false in status col in parse)
    if(actualHourGuatemala > endDatePromotion){
      couponData.id = idPromo;
      couponData.set("Status",false);
      couponData.save();
    } else {
      couponData.id = idPromo;
      couponData.set("Status",true);
      couponData.save();
    };
};

Parse.Cloud.job("verifyFinalizedCoupons", function (request, status) {
    // Connection with Hours Class for objectId
    var query = new Parse.Query('Cupon');
    // Take the Date of Guatemala City Country in long date
    var actualHour = moment().tz("America/Guatemala").format('LLL');
    query.equalTo("TypeCoupon", "Fecha");
    query.equalTo("Status", true);

    // Find the endDate in Hour class ClassName
    query.find({
        success: function(results) {
            for (i in results) {
                // Take the actualHour variable for send to changeStatus function
                changeStatusCoupons(results[i].attributes.EndDate,results[i].id,actualHour);
            };
        },
        error: function(error){
            console.log(error);
        }

    }).then(function() {
        // Set the job's success status
        status.success("Verification completed successfully.");
    }, function(error) {
        // Set the job's error status
        status.error("Uh oh, something went wrong.");
    });;
});

// Get count of coupons for categories
Parse.Cloud.job('QuantityPromotionsForCategories', function(request, status) {

    /* Create query for search AppCategory */
    var Category = new Parse.Query('AppCategory');

    /* Create query for search Promotions */
    var Promotion = new Parse.Query('Promotion');
    Promotion.equalTo("Status",true);

    var CountPromotionForCustomer = new Parse.Object.extend("AppCategory");
    var CountPromotion = new CountPromotionForCustomer();

    Category.each(function(CategoryResults) {

      Promotion.equalTo("CategoryApp", CategoryResults.get('CategoryName'));

      return Promotion.count({
          success: function(count) {
              // The count request succeeded. Show the count
              console.log(count);
              CountPromotion.id = CategoryResults.id;
              CountPromotion.set("QuantityPromotion",count);
              return CountPromotion.save();
            },
            error: function(error) {
              return "The request failed"
            }
      });
    }).then(function() {
        // Set the job's success status
        status.success("Count completed successfully.");
    }, function(error) {
        // Set the job's error status
        status.error("Uh oh, something went wrong.");
    });
});

// Event "JOB" for calculate the count of promotions for each customer
Parse.Cloud.job('QuantityPromotionsForCustomer', function(request, status){

    /* Create query for search Customer */
    var Customer = new Parse.Query('Customer');
    /* Create query for search Promotions */
    var Promotion = new Parse.Query('Promotion');

    var CountPromotionForCustomer = new Parse.Object.extend("Customer");
    var CountPromotion = new CountPromotionForCustomer();

    Promotion.equalTo("Status",true)

    Customer.each(function (CustomerResults) {

        Promotion.equalTo("Customer", CustomerResults.get('Name'));

        return Promotion.count({
            success: function(count) {
                // The count request succeeded. Show the count
                CountPromotion.id = CustomerResults.id;
                CountPromotion.set("QuantityPromotion",count);
                return CountPromotion.save();
            },
            error: function(error) {
                // The request failed
            }
        })
    }).then(function() {
        // Set the job's success status
        status.success("Count completed successfully.");
    }, function(error) {
        // Set the job's error status
        status.error("Uh oh, something went wrong.");
    })
});

// Get count of coupons for categories
Parse.Cloud.job('QuantityPromotionsForCoupons', function(request, status){

    /* Create query for search AppCategory */
    var Category = new Parse.Query('AppCategory');
    /* Create query for search Promotions */
    var Coupons = new Parse.Query('Cupon');
    Coupons.equalTo("Status",true)

    var CountCouponsEnt = new Parse.Object.extend("AppCategory");
    var CountCoupons = new CountCouponsEnt();
    /* Create query for search Cupones */

    Category.each(function (CategoryResults) {
        Coupons.equalTo("CategoryApp", CategoryResults.get('CategoryName'));
        return Coupons.count({
            success: function(count) {
                // The count request succeeded. Show the count
                CountCoupons.id = CategoryResults.id;
                CountCoupons.set("QuantityCoupon",count);
                return CountCoupons.save();
            },
            error: function(error) {
                // The request failed
            }
        })
    }).then(function() {
        // Set the job's success status
        status.success("Count completed successfully.");
    }, function(error) {
        // Set the job's error status
        status.error("Uh oh, something went wrong.");
    })
})

// Event "JOB" for calculate the count of coupons for each customer
Parse.Cloud.job('QuantityCouponsForCustomer', function(request, status){

    /* Create query for search Customer */
    var Customer = new Parse.Query('Customer');
    /* Create query for search Coupons */
    var Coupons = new Parse.Query('Cupon');

    var CountCouponsForCustomer = new Parse.Object.extend("Customer");
    var CountCoupons = new CountCouponsForCustomer();

    Coupons.equalTo("Status",true)

    Customer.each(function (CustomerResults) {

        Coupons.equalTo("Customer", CustomerResults.get('Name'));

        return Coupons.count({
            success: function(count) {
                // The count request succeeded. Show the count
                CountCoupons.id = CustomerResults.id;
                CountCoupons.set("QuantityCoupon",count);

                return CountCoupons.save();
            },
            error: function(error) {
                // The request failed
            }
        })
    }).then(function() {
        // Set the job's success status
        status.success("Count completed successfully.");
    }, function(error) {
        // Set the job's error status
        status.error("Uh oh, something went wrong.");
    });
});

// Event "JOB" for calculate the total count of coupons for each customer
Parse.Cloud.job('AverageSavingForCustomer', function(request, status){
    /* Create query for search Customer */
    var Customer = new Parse.Query('Customer');

    /* Create query for search Promotions */
    var Promotion = new Parse.Query('Promotion');
    Promotion.equalTo("Status",true)

    var Average = new Parse.Object.extend("Customer");
    var AverageSave = new Average();

    Customer.each(function (CustomerResults) {
        console.log('entra a customer');
        Promotion.equalTo("Customer", CustomerResults.get('Name'));

        var PromotionSaveCash = 0
        var TotalPromo = 0
        return Promotion.each(function(PromotionResults){
            // Variable for calculate PromotionalSave
            PromotionSaveCash =+ (PromotionResults.attributes.BasePrice - PromotionResults.attributes.PromotionalPrice)
            // Variable for calculate the AverageSaving for Customer with PromotionalSave
            TotalPromo = TotalPromo +PromotionSaveCash/CustomerResults.attributes.QuantityPromotion
        }).then(function() {
            AverageSave.id = CustomerResults.id;
            // Variable for to convert integer number to float number
            var CountTwoDecimalsSave = TotalPromo.toFixed(2);
            if (TotalPromo) {
              // For to save AverageSaving into Customer Entity
              AverageSave.set("AverageSaving", parseFloat(CountTwoDecimalsSave));
              return AverageSave.save();
            } else {
              // If doesn't exist Promotion then AverageSaving is 0
              AverageSave.set("AverageSaving", 0);
              return AverageSave.save();
            };
        }, function(error) {
            console.log(error);
        });
    }).then(function() {
        // Set the job's success status
        status.success("Average completed successfully.");
    }, function(error) {
        // Set the job's error status
        status.error("Uh oh, something went wrong.");
    });
});

Parse.Cloud.define('GetCustomer', function(request, response) {
    var CustomerList = [];
    var Customer = new Parse.Query('Customer');

    Customer.each(function(results) {
        CustomerList.push({
            name: results.attributes.Logo._url,
            promo: results.attributes.QuantityPromotion,
            promedio: results.attributes.AverageSaving,
            lastText: "favorite", NameCategory: results.attributes.Name,
            oferta : 'existe',
            colorHeart: "white",
            Category:results.attributes.CategoryApp,
            coupon: results.attributes.QuantityCoupon
        })
    }).then(function () {
          response.success(CustomerList);
        });

});

/* Get and return an object for Promotions entity */
Parse.Cloud.define('GetPromotionsApp', function(request, response) {
    var CurrentPromotion = [];
    var Promotion = new Parse.Query('Promotion');

    var Customer = new Parse.Query('Customer');

    // Search Promotions with status true
    Promotion.equalTo('Status', true);

    Promotion.each(function(results) {
      for (i in results.attributes.Customer) {
          if(results.attributes.Photo === null || results.attributes.Photo === undefined){

              if(results.attributes.TypePromotion === 'DirectDiscount'){
                var ahorroString = results.attributes.BasePrice - results.attributes.PromotionalPrice;
                var basePriceString = results.attributes.BasePrice;
                var promotionalPriceString = results.attributes.PromotionalPrice;
                ahorroString = ahorroString.toString();
                basePriceString = basePriceString.toString();
                promotionalPriceString = promotionalPriceString.toString();

                  CurrentPromotion.push({
                      nul:"sin",
                      name:results.attributes.Name,
                      presentation:results.attributes.Presentation,
                      description:results.attributes.PromotionDescription,
                      basePrice:'Q'+ basePriceString,
                      promotionalPrice:'Q'+ promotionalPriceString,
                      textDiscount: 'Ahorra',
                      ahorro:'Q'+ ahorroString,
                      before: 'Antes',
                      TypePromotion:results.attributes.TypePromotion,
                      Category:results.attributes.Customer[i],
                      ID:"pinOfferts",
                      IDpromotion: results.id,
                      conteo:0,
                      oferta:"existe",
                      Our_Favorites:results.attributes.OurFavorite,
                      PhotoFavorite: results.attributes.PhotoFavorite,
                      Logo:"",
                      ColorPin: "silver",
                      ShopOnline:results.attributes.ShopOnline,
                      IconShopOnline: "j",
                      // Display for cart
                      Display: ""
                  });
            } else if(results.attributes.TypePromotion === 'Percentage'){
                CurrentPromotion.push({
                    nul:"sin",
                    name:results.attributes.Name,
                    presentation:results.attributes.Presentation,
                    description:results.attributes.PromotionDescription,
                    promotionalPrice:'Descuento Especial',
                    ahorro:results.attributes.Percentage + '%',
                    TypePromotion:results.attributes.TypePromotion,
                    Category:results.attributes.Customer[i],
                    ID:"pinOfferts",
                    IDpromotion: results.id,
                    conteo:0,
                    oferta:"existe",
                    Our_Favorites:results.attributes.OurFavorite,
                    PhotoFavorite: results.attributes.PhotoFavorite,
                    Logo:"",
                    ColorPin: "silver",
                    ShopOnline:results.attributes.ShopOnline,
                    IconShopOnline: "j",
                    // Display for cart
                    Display: ""
                });
            } else if(results.attributes.TypePromotion === 'SpecialPromotion'){

                CurrentPromotion.push({
                    nul:"sin",
                    name:results.attributes.Name,
                    presentation:results.attributes.Presentation,
                    description:results.attributes.PromotionDescription,
                    display: 'none',
                    promotionalPrice:'Promoción Especial',
                    TypePromotion:results.attributes.TypePromotion,
                    Category:results.attributes.Customer[i],
                    ID:"pinOfferts",
                    IDpromotion: results.id,
                    conteo:0,
                    oferta:"existe",
                    Our_Favorites:results.attributes.OurFavorite,
                    PhotoFavorite: results.attributes.PhotoFavorite,
                    Logo:"",
                    ColorPin: "silver",
                    ShopOnline:results.attributes.ShopOnline,
                    IconShopOnline: "j",
                    // Display cart
                    Display: "",
                    icon: 'c'
                });
            }
          } else {

                if(results.attributes.TypePromotion === 'DirectDiscount'){
                  var ahorroString = results.attributes.BasePrice - results.attributes.PromotionalPrice;
                  var basePriceString = results.attributes.BasePrice;
                  var promotionalPriceString = results.attributes.PromotionalPrice;
                  ahorroString = ahorroString.toString();
                  basePriceString = basePriceString.toString();
                  promotionalPriceString = promotionalPriceString.toString();

                    CurrentPromotion.push({
                        nul:"con",
                        name:results.attributes.Name,
                        photo:results.attributes.Photo._url,
                        presentation:results.attributes.Presentation,
                        description:results.attributes.PromotionDescription,
                        basePrice:'Q'+ basePriceString,
                        promotionalPrice:'Q'+ promotionalPriceString,
                        textDiscount: 'Ahorra',
                        ahorro:'Q'+ ahorroString,
                        before: 'Antes',
                        TypePromotion:results.attributes.TypePromotion,
                        Category:results.attributes.Customer[i],
                        ID:"pinOfferts",
                        IDpromotion: results.id,
                        conteo:0,
                        oferta:"existe",
                        Our_Favorites:results.attributes.OurFavorite,
                        PhotoFavorite: results.attributes.PhotoFavorite,
                        Logo:"",
                        ColorPin: "silver",
                        ShopOnline:results.attributes.ShopOnline,
                        IconShopOnline: "j",
                        // Display for cart
                        Display: ""
                    });
              } else if(results.attributes.TypePromotion === 'Percentage'){
                  CurrentPromotion.push({
                      nul:"con",
                      name:results.attributes.Name,
                      photo:results.attributes.Photo._url,
                      presentation:results.attributes.Presentation,
                      description:results.attributes.PromotionDescription,
                      promotionalPrice:'Descuento Especial',
                      ahorro:results.attributes.Percentage + '%',
                      TypePromotion:results.attributes.TypePromotion,
                      Category:results.attributes.Customer[i],
                      ID:"pinOfferts",
                      IDpromotion: results.id,
                      conteo:0,
                      oferta:"existe",
                      Our_Favorites:results.attributes.OurFavorite,
                      PhotoFavorite: results.attributes.PhotoFavorite,
                      Logo:"",
                      ColorPin: "silver",
                      ShopOnline:results.attributes.ShopOnline,
                      IconShopOnline: "j",
                      // Display for the cart
                      Display: ""
                  });
              } else if(results.attributes.TypePromotion === 'SpecialPromotion'){
                  CurrentPromotion.push({
                      nul:"con",
                      photo:results.attributes.Photo._url,
                      name:results.attributes.Name,
                      presentation:results.attributes.Presentation,
                      description:results.attributes.PromotionDescription,
                      display: 'none',
                      promotionalPrice:'Promoción Especial',
                      TypePromotion:results.attributes.TypePromotion,
                      Category:results.attributes.Customer[i],
                      ID:"pinOfferts",
                      IDpromotion: results.id,
                      conteo:0,
                      oferta:"existe",
                      Our_Favorites:results.attributes.OurFavorite,
                      PhotoFavorite: results.attributes.PhotoFavorite,
                      Logo:"",
                      ColorPin: "silver",
                      ShopOnline:results.attributes.ShopOnline,
                      IconShopOnline: "j",
                      // Display for cart
                      Display: ""
                  });
              }
          }



      }
    }).then(function () {
        response.success(CurrentPromotion);
    });
});
/* Get and return an object for Coupons entity */
Parse.Cloud.define('GetCouponsApp', function(request, response) {
    var CurrentCoupons = [];
    var Coupons = new Parse.Query('Cupon');
    // Search Coupons with status true
    Coupons.equalTo('Status', true);

    Coupons.each(function(results) {
        for (i in results.attributes.Customer) {
            if(results.attributes.PhotoCupon === null || results.attributes.PhotoCupon === undefined){
                CurrentCoupons.push({
                    nul:"sin",
                    name:results.attributes.Name,
                    description:results.attributes.PromotionDescription,
                    Canjea:results.attributes.CuponDiscount,
                    Category:results.attributes.Customer[i],
                    cupon:"existe",
                    ColorPinCupon: "silver",
                    BarCodePhoto:results.attributes.BarCodePhoto,
                    Presentation:results.attributes.Presentation,
                    description:results.attributes.PromotionDescription,
                    customer:results.attributes.Customer[i],
                    PhotoCupon:results.attributes.PhotoCupon,
                    Publication_Date:results.attributes.PublicationDate,
                    End_Date:results.attributes.EndDate,
                    IDCupon:results.id,
                    Categoryapp:results.attributes.CategoryApp,
                    TypeCoupon:results.attributes.TypeCoupon,
                    QuantityCoupons:results.attributes.QuantityCoupons,
                    QuantityExchanged:results.attributes.QuantityExchanged,
                    ShopOnline:results.attributes.ShopOnline,
                    Display:"",
              });
          } else {
              CurrentCoupons.push({
                  nul:"con",
                  name:results.attributes.Name,
                  description:results.attributes.PromotionDescription,
                  Canjea:results.attributes.CuponDiscount,
                  Category:results.attributes.Customer[i],
                  cupon:"existe",
                  ColorPinCupon: "silver",
                  BarCodePhoto:results.attributes.BarCodePhoto,
                  Presentation:results.attributes.Presentation,
                  description:results.attributes.PromotionDescription,
                  customer:results.attributes.Customer[i],
                  PhotoCupon:results.attributes.PhotoCupon,
                  Publication_Date:results.attributes.PublicationDate,
                  End_Date:results.attributes.EndDate,
                  IDCupon:results.id,
                  Categoryapp:results.attributes.CategoryApp,
                  TypeCoupon:results.attributes.TypeCoupon,
                  QuantityCoupons:results.attributes.QuantityCoupons,
                  QuantityExchanged:results.attributes.QuantityExchanged,
                  ShopOnline:results.attributes.ShopOnline,
                  Display:"",
              });
          }
      }
    }).then(function() {
        response.success(CurrentCoupons);
    });
});
/* http request for callback CountCouponCustomer by means of job work */
Parse.Cloud.define("CountCouponCustomer", function(request, response) {
  /* Create query for search Customer */
  var Customer = new Parse.Query('Customer');
  /* Create query for search Coupons */
  var Coupons = new Parse.Query('Cupon');

  var CountCouponsForCustomer = new Parse.Object.extend("Customer");
  var CountCoupons = new CountCouponsForCustomer();

  Coupons.equalTo("Status",true)

  Customer.each(function (CustomerResults) {

      Coupons.equalTo("Customer", CustomerResults.get('Name'));

      return Coupons.count({
          success: function(count) {
              // The count request succeeded. Show the count
              CountCoupons.id = CustomerResults.id;
              CountCoupons.set("QuantityCoupon",count);

              return CountCoupons.save();
          },
          error: function(error) {
              // The request failed
          }
      })
  }).then(function() {
      // Set the job's success status
      response.success("Count customer completed successfully.");
  }, function(error) {
      // Set the job's error status
      response.error("Uh oh, something went wrong in custmer count.");
  });
});

/* http request for callback CountCouponCategories by means of job work */
Parse.Cloud.define("CountCouponCategories", function(request, response) {
  /* Create query for search AppCategory */
  var Category = new Parse.Query('AppCategory');
  /* Create query for search Promotions */
  var Coupons = new Parse.Query('Cupon');
  Coupons.equalTo("Status",true)

  var CountCouponsEnt = new Parse.Object.extend("AppCategory");
  var CountCoupons = new CountCouponsEnt();
  /* Create query for search Cupones */

  Category.each(function (CategoryResults) {
      Coupons.equalTo("CategoryApp", CategoryResults.get('CategoryName'));
      return Coupons.count({
          success: function(count) {
              // The count request succeeded. Show the count
              CountCoupons.id = CategoryResults.id;
              CountCoupons.set("QuantityCoupon",count);
              return CountCoupons.save();
          },
          error: function(error) {
              // The request failed
          }
      })
  }).then(function() {
      // Set the job's success status
      response.success("Count categories completed successfully in categories.");
  }, function(error) {
      // Set the job's error status
      response.error("Uh oh, something went wrong.");
  });
});
