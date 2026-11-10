// Entirely fictional entries. The IDs and URLs are syntactic fixtures only.
// The demo never displays or opens the links.
const item = (id, title, priceAmount, minAgeYears = 0) => ({
  id, title, priceAmount, minAgeYears, maxAgeYears: null,
  persons: [], occasions: [], quality: 0,
  link: `https://www.amazon.de/dp/${id}`,
  image: 'https://m.media-amazon.com/images/I/example.jpg'
});
export const catalog = {
  affiliateTag: 'example-21',
  rules: {},
  products: [
    item('B000000001', 'Picknickdecke für unterwegs', 24.90),
    item('B000000002', 'Brettspiel für die Familie', 19.90, 8),
    item('B000000003', 'Garten Anzuchtset', 17.90, 6),
    item('B000000004', 'Aquarell Kreativset', 22.90, 10)
  ]
};
