// src/models/Category.js
import mongoose, { Schema } from 'mongoose';

const CategorySchema = new Schema(
  {
    name: { 
      type: String, 
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters long'],
      maxlength: [50, 'Category name cannot exceed 50 characters']
    },
    slug: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true
    },
    description: { 
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },
    level: {
      type: Number,
      default: 0,
      min: 0
    },
    path: [{
      type: Schema.Types.ObjectId,
      ref: 'Category'
    }],
    imageUrl: { 
      type: String,
      validate: {
        validator: function(v) {
          return !v || v.startsWith('http://') || v.startsWith('https://');
        },
        message: 'Image URL must be a valid URL'
      }
    },
    media: [{
      url: { type: String, required: true },
      type: { type: String, enum: ['image', 'video'], default: 'image' },
      alt: { type: String }
    }],
    icon: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    seo: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      keywords: [{ type: String, trim: true }]
    },
    attributes: [{
      name: { type: String, required: true },
      type: { 
        type: String, 
        enum: ['text', 'number', 'boolean', 'select', 'multiselect'],
        required: true
      },
      options: [{ type: String }],
      required: { type: Boolean, default: false },
      filterable: { type: Boolean, default: false },
      searchable: { type: Boolean, default: false }
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for id
CategorySchema.virtual('id').get(function () {
  return this._id.toString();
});

// Virtual for parent category name
CategorySchema.virtual('parentName').get(function () {
  if (this.populated('parentId') && this.parentId?.name) {
    return this.parentId.name;
  }
  return undefined;
});

// Virtual for subcategories
CategorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId'
});

// Virtual for product count
CategorySchema.virtual('productCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'categoryId',
  count: true
});

// Pre-save middleware to generate slug
CategorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Pre-save middleware to update level and path
CategorySchema.pre('save', async function(next) {
  if (this.isModified('parentId')) {
    if (this.parentId) {
      const parent = await this.constructor.findById(this.parentId);
      if (parent) {
        this.level = parent.level + 1;
        this.path = [...parent.path, parent._id];
      }
    } else {
      this.level = 0;
      this.path = [];
    }
  }
  next();
});

// Static method to get category tree
CategorySchema.statics.getTree = async function() {
  const categories = await this.find()
    .populate('parentId', 'name')
    .sort({ displayOrder: 1, name: 1 });
  
  const buildTree = (items, parentId = null) => {
    return items
      .filter(item => item.parentId?._id?.toString() === parentId?.toString())
      .map(item => ({
        ...item.toObject(),
        children: buildTree(items, item._id)
      }));
  };

  return buildTree(categories);
};

// Static method to get category path
CategorySchema.statics.getPath = async function(categoryId) {
  const category = await this.findById(categoryId).populate('path');
  return category?.path || [];
};

// Create indexes
CategorySchema.index({ name: 'text', description: 'text' });
CategorySchema.index({ name: 1 });
CategorySchema.index({ slug: 1 });
CategorySchema.index({ parentId: 1 });
CategorySchema.index({ level: 1 });
CategorySchema.index({ path: 1 });
CategorySchema.index({ isActive: 1 });
CategorySchema.index({ displayOrder: 1 });
CategorySchema.index({ createdAt: -1 });

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

export { Category };