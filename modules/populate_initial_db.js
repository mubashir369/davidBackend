const arango = require('arangojs')
const config = require('./config')
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('modules/salon.json'));
console.log(data)
var Database = arango.Database,
    aql = arango.aql,
    db = new Database(config.db.host)

    db.useDatabase(config.db.database);
    db.useBasicAuth(config.db.username, config.db.password);

    const collections = [
        'member_inquiery', 
        'charges', 
        'cafeTables', 
        'customer_memberships', 
        'looks', 
        'memberships', 
        'banner', 
        'reports', 
        'membership_cycle', 
        'notifications', 
        'service_tasks', 
        'admins', 
        'caffeCategories', 
        'member_subscriptions', 
        'cafe_time', 
        'customers', 
        'staff', 
        'products', 
        'offer_codes', 
        'home_CMS', 
        'member_about', 
        'consultations', 
        'testimonials', 
        'vouchers', 
        'settings', 
        'staff_bookings', 
        'appointments', 
        'transactions', 
        'member_transactions', 
        'countries', 
        'members', 
        'seats', 
        'membership_update_requests', 
        'slots', 
        'refunds', 
        'services_cms_data', 
        'events', 
        'cafeproducts', 
        'blog', 
        'services', 
        'contacts', 
        'newsLetters', 
        'salon', 
        'member_enquiry', 
        'wallet_transactions'
      ];
      
    
function createCollection(e){
    e.map((item)=>{
        db.collection(`${item}`).create()
        .then(() => console.log(`created collection ${item}`))
        .catch(err => console.error('Failed to create collection:', err));
    })
   
}
function listCollection(){
    db.collections()
    .then(collections => {
      console.log('Collections:', collections.map(c => c.name).join(', '));
    })
    .catch(err => console.error('Failed to list collections:', err));
}

const collectionName ="salon"
// uncomment below line to populate the Database
createCollection(collections);
db.collection(collectionName)
  .import(data)
  .then(() => console.log(`Imported data into collection ${collectionName}!`))
  .catch(err => console.error(`Failed to import data into collection ${collectionName}:`, err));

listCollection()


