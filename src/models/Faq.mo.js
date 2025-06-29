import mongoose, { Schema } from 'mongoose';

const FAQSchema = new Schema(
  {
    question: {
      type: String,
      required: [true, 'Question is required'],
      trim: true,
      minlength: [3, 'Question must be at least 3 characters long'],
      maxlength: [500, 'Question cannot exceed 500 characters']
    },
    answer: {
      type: String,
      required: [true, 'Answer is required'],
      trim: true,
      minlength: [3, 'Answer must be at least 3 characters long'],
      maxlength: [2000, 'Answer cannot exceed 2000 characters']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      enum: {
        values: ['General', 'Shipping', 'Payment', 'Returns', 'Products', 'Account', 'Technical'],
        message: '{VALUE} is not a valid category'
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    tags: [{
      type: String,
      trim: true
    }],
    seo: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      keywords: [{ type: String, trim: true }]
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for id
FAQSchema.virtual('id').get(function () {
  return this._id.toString();
});

// Create indexes
FAQSchema.index({ question: 'text', answer: 'text' });
FAQSchema.index({ category: 1 });
FAQSchema.index({ isActive: 1 });
FAQSchema.index({ displayOrder: 1 });
FAQSchema.index({ createdAt: -1 });

const FAQModel = mongoose.models.FAQ || mongoose.model('FAQ', FAQSchema);

export default FAQModel;