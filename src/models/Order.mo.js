import mongoose, { Schema } from 'mongoose';

const ORDER_STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Refunded"];

const CustomerInfoSchema = new Schema({
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  shippingAddress: { type: String, required: true },
  billingAddress: { type: String },
}, { _id: false });

const OrderItemSchema = new Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  productImage: { type: String },
  sku: { type: String },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  selectedSize: { type: String },
  selectedColor: { type: String },
  brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
}, { _id: false });

const ReturnRequestSchema = new Schema({
  itemId: { type: String, required: true }, // productId or unique item identifier
  type: { type: String, enum: ['return', 'exchange'], required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['requested', 'approved', 'rejected', 'completed'], default: 'requested' },
  requestedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  quantity: { type: Number, default: 1 },
  exchangeForSize: { type: String },
  exchangeForColor: { type: String },
  adminNotes: { type: String },
}, { _id: true });

const StatusHistorySchema = new Schema({
  status: { type: String, enum: ORDER_STATUSES, required: true },
  changedAt: { type: Date, default: Date.now },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
}, { _id: false });

const OrderSchema = new Schema(
  {
    customerInfo: { type: CustomerInfoSchema, required: true },
    items: [OrderItemSchema],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUSES, required: true, default: "Pending", index: true },
    orderDate: { type: Date, default: Date.now, index: true },
    notes: { type: String },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
    media: [{ type: String }],
    returns: [ReturnRequestSchema],
    statusHistory: [StatusHistorySchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

OrderSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

export { Order };