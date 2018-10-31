const fetch = require('node-fetch');
const cheerio = require('cheerio');
const db = require('./db');

// Delay function to prevent from being banned by the scraping site
const delay = (milliseconds) => {
  console.log("Waiting 10 seconds!")
  return new Promise((resolve, reject) => {
    setTimeout(resolve, milliseconds);
  });
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Get all Restaurants and push them to the DataBase!!
const getRestaurants = async (state, city) => {
  const url = `https://www.allmenus.com/${state.toLowerCase()}/${city.toLowerCase()}/-/`;
  const baseUrl = "https://www.allmenus.com";
  /* fetch(url)
    .then(response => response.text())
    .then(body => {
      console.log(body);
    }); */
  const response = await fetch(url);
  const body = await response.text();
  const $ = cheerio.load(body);
  const restaurants = [];
  const promises = [];

  // Get details about the Scraped list of restaurants
  $('.restaurant-list-item').each((i, item) => {
    // Get Name & Menu Link of Restaurant
    const description = $(item).find('h4.name');
    const name = description.text();
    const menuLink = $(description).find('a').attr('href');

    // Get Address
    const address = [];
    $(item).find('div.address-container .address').each((i, addressPart) => {
      address.push($(addressPart).text().trim())
    });

    // Get Order (Grubhub, etc.) Link if exists
    var orderLink = $(item).find('a.grubhub').attr('href');
    if (!orderLink) {
      orderLink = '';
    }

    // Get Cuisine List
    const cuisine = $(item).find('p.cousine-list').text().trim();

    // Initialize & Populate Restaurant Object
    const restaurant = {
      id: '',
      name,
      link: baseUrl + menuLink,
      cuisine: cuisine.split(', '),
      address: address.join(' \n '),
      order: orderLink,
      city,
      state
    };

    // Push Restaurant to DataBase
    const newRestaurant = db.collection('restaurants').doc();
    restaurant.id = newRestaurant.id;
    promises.push(newRestaurant.set(restaurant));
    console.log(restaurant.name + " Pushed!");
    // Push Restaurant Object into the Array
    restaurants.push(restaurant);

    /* --Using Promise--
      newRestaurant.set(restaurant)
      .then((res) => {
        console.log("Restaurant Id: " + newRestaurant.id);
      })
      .catch(err => console.log(err)); */
  });

  // Calling to scrape Menu for Scraped list of Restaurants
  for (const restaurant of restaurants) {
    await getMenu(restaurant.id, restaurant.link, restaurant.name);
    await delay(1000);
  }

  await Promise.all(promises);
  console.log("Done Pushing to Database!!");
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Get Menus of a Restaurant from the site's application/ld+json & push them to DataBase
const getMenu = async (id, link, name) => {
  // Get Restaurant from Firebase
  /* let restaurant = {};
  const restaurantRef = db.collection('restaurants').doc(id);
  const rest = await restaurantRef.get();
  restaurant = rest.data(); */
  /* restaurantRef.get()
  .then((rest) => {
    restaurant = rest.data();
    console.log(restaurant);
  })
  .catch(err => console.log(err)); */

  // Scrape menuLink for Menu data
  const response = await fetch(link);
  const body = await response.text();
  const $ = cheerio.load(body);

  const rawJSON = $($('script[type="application/ld+json"]')[0]).html();
  if (rawJSON) {
    rawJSON = rawJSON.replace(/\n/g, '');
    const menuData = JSON.parse(rawJSON);

    if (menuData.hasMenu && menuData.hasMenu.length > 0) {
      const promises = [];
      menuData.hasMenu.forEach(menu => {
        if (menu.hasMenuSection && menu.hasMenuSection.length > 0) {
          menu.hasMenuSection.forEach(section => {
            if (section.hasMenuItem && section.hasMenuItem.length > 0) {
              section.hasMenuItem.forEach(item => {
                item.menu_name = menu.name;
                item.menu_section_name = section.name;
                item.restaurant_id = id;
                item.geo = menuData.geo;
                promises.push(db.collection('menu_items').add(item));
              });
            }
          });
        }
      });
      await Promise.all(promises);
      console.log("Name: " + name);
    } else {
      console.log("No Menus Found");
    }
  } else {
    console.log("No Data to Parse");
  }
};

getRestaurants('oh', 'columbus');