import Item from '../modals/item.js';
import cloudinary from '../config/cloudinary.js';

export const createItem = async (req, res, next) => {
  try {
    const { name, description, category, price, rating, hearts } = req.body;

    let imageUrl = '';

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'plateful-items'
      });
      imageUrl = result.secure_url;
    }

    const newItem = new Item({
      name,
      description,
      category,
      price,
      rating,
      hearts,
      imageUrl
    });

    const saved = await newItem.save();
    res.status(201).json(saved);
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ message: 'Item name already exists' });
    } else {
      next(err);
    }
  }
};

export const getItems = async (_req, res, next) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const deleteItem = async (req, res, next) => {
  try {
    const removed = await Item.findByIdAndDelete(req.params.id);
    if (!removed) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
