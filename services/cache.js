const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');

const redisUrl = 'redis://127.0.0.1:6379';
const client = redis.createClient(redisUrl);
client.hget = util.promisify(client.hget);
//reference original default exec function
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function (options = {}) {
    this.useCache = true;
    this.hashKey = JSON.stringify(options.key || '');
    return this;
}
//overwrite exec and add additional logic
mongoose.Query.prototype.exec = async function () {//arrow messes with the value of this inside a function so use function instead of arrow function
    if (!this.useCache) {
        return exec.apply(this, arguments);
    }

    const key = JSON.stringify(
        Object.assign({}, this.getQuery(), {
            collection: this.mongooseCollection.name
        }));

    //See if have value for 'key' in redis
    const cacheValue = await client.hget(this.hashkey, key);

    //If do return it
    if (cacheValue) {
        //console.log(cacheValue);
        //const doc = new this.model(JSON.parse(cacheValue));//same as new Blog({title: 'hi', content: 'there'})
        //return JSON.parse(doc);
        const doc = JSON.parse(cacheValue);
        return Array.isArray(doc) //its an array : its an object
            ? doc.map(d => new this.model(d))
            : new this.model(doc);
    }

    //Otherwise issue query and store result in redis

    const result = await exec.apply(this, arguments);
    console.log(result);
    client.hset(this.hashKey, key, JSON.stringify(result), 'EX', 10);
    return result;
};

module.exports = {
    clearHash(hashKey) {
        client.del(JSON.stringify(hashKey));
    }
};