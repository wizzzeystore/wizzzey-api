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
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  selectedSize: { type: String },
  brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
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