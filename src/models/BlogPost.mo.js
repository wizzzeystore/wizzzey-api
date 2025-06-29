import mongoose, { Schema } from 'mongoose';

const BlogPostSchema = new Schema(
  {
    title: { type: String, required: true, index: true },
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    publishedAt: { type: Date, required: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    tags: [{ type: String, index: true }],
    imageUrl: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

BlogPostSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

const BlogPostModel = mongoose.models.BlogPost || mongoose.model('BlogPost', BlogPostSchema);

export default BlogPostModel; 