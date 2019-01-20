const mongoose = require('mongoose');
const requireLogin = require('../middlewares/requireLogin');
const cleanCache = require('../middlewares/cleanCache');
const Blog = mongoose.model('Blog');

module.exports = app => {
  app.get('/api/blogs/:id', requireLogin, async (req, res) => {
    const blog = await Blog.findOne({
      _user: req.user.id,
      _id: req.params.id
    });

    res.send(blog);
  });

  app.get('/api/blogs', requireLogin, async (req, res) => {
    const blogs = await Blog.find({ _user: req.user.id }).cache({ key: req.user.id });
    res.send(blogs);
    /*
        const redis = require('redis');
        const redisUrl = 'redis://127.0.0.1:6379';
        const client = redis.createClient(redisUrl);
        const util = require('util');//to get promisify instead of using callback
        client.get = util.promisify(client.get);
    
        //do we have any cached data in redis related to this query
        const cachedBlogs = await client.get(req.user.id);
    
        //if yes, respond to request right away and return
        if (cachedBlogs) {
          console.log('SERVING FROM CACHE');
          return res.send(JSON.parse(cachedBlogs));
        }
        //if no, need to respons to request and update cache to store the data
        const blogs = await Blog.find({ _user: req.user.id });
        console.log('SERVING FROM MONGODB');
        res.send(blogs);
        client.set(req.user.id, JSON.stringify(blogs));*/
  });

  app.post('/api/blogs', requireLogin, cleanCache, async (req, res) => {
    const { title, content } = req.body;

    const blog = new Blog({
      title,
      content,
      _user: req.user.id
    });

    try {
      await blog.save();
      res.send(blog);
    } catch (err) {
      res.send(400, err);
    }
  });
};
