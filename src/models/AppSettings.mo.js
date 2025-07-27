import mongoose, { Schema } from 'mongoose';

const NotificationsSchema = new Schema({
  newOrderEmails: { type: Boolean, default: true },
  lowStockAlerts: { type: Boolean, default: true },
  productUpdatesNewsletter: { type: Boolean, default: false },
}, { _id: false });

const ApiSettingsSchema = new Schema({
  apiKey: { type: String },
  apiKeyLastGenerated: { type: Date },
}, { _id: false });

const ImageSchema = new Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
}, { _id: false });

const AppSettingsSchema = new Schema(
  {
      storeName: { type: String, required: true },
      defaultStoreEmail: { type: String, required: true },
      maintenanceMode: { type: Boolean, default: false },
      darkMode: { type: Boolean, default: false },
      themeAccentColor: { type: String, default: 'var(--accent)' },
      storeLogoUrl: { type: String, default: '' },
      storeLogo: { type: ImageSchema, default: null },
      heroImage: { type: ImageSchema, default: null },
      footerImage: { type: ImageSchema, default: null },
      footerText: {
        title: { type: String, default: 'Fresh Styles Just In!' },
        description: { type: String, default: "Don't miss out on our newest arrivals. Update your wardrobe with the latest looks." },
        buttonText: { type: String, default: 'Explore New Arrivals' },
        buttonLink: { type: String, default: '/shop?sortBy=createdAt&sortOrder=desc' }
      },
      announcementBar: {
        enabled: { type: Boolean, default: true },
        text: { type: String, default: 'ADDITIONAL 10% OFF ON PREPAID ORDERS' },
        backgroundColor: { type: String, default: '#000000' },
        textColor: { type: String, default: '#ffffff' }
      },
      notifications: { type: NotificationsSchema, default: {} },
      apiSettings: { type: ApiSettingsSchema, default: {} }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

AppSettingsSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

const AppSettingsModel = mongoose.models.AppSettings || mongoose.model('AppSettings', AppSettingsSchema);

export default AppSettingsModel; 