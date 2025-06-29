import mongoose, { Schema } from 'mongoose';

const DISCOUNT_TYPES = ['percentage', 'fixed_amount'];
const DISCOUNT_APPLIES_TO = ['all_orders', 'specific_products', 'specific_categories'];

const DiscountCodeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    type: { type: String, enum: DISCOUNT_TYPES, required: true },
    value: { type: Number, required: true },
    isActive: { type: Boolean, default: true, index: true },
    startDate: { type: Date },
    endDate: { type: Date },
    minPurchaseAmount: { type: Number },
    usageLimitPerCode: { type: Number },
    usageLimitPerCustomer: { type: Number },
    timesUsed: { type: Number, default: 0 },
    appliesTo: { type: String, enum: DISCOUNT_APPLIES_TO, default: 'all_orders' },
    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

DiscountCodeSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

const DiscountCodeModel = mongoose.models.DiscountCode || mongoose.model('DiscountCode', DiscountCodeSchema);

export default DiscountCodeModel; 