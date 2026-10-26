/**
 * products-store.js — مزامنة المنتجات من Cloud Firestore فقط.
 * جميع عمليات القراءة والكتابة محصورة في مجموعة products.
 * تعتمد على firebase-client.js المحمّل قبلها.
 */
(function () {
  window.storeProductsReady = false;

  function firestoreAvailable() {
    return !!(window.db && typeof window.db.collection === 'function');
  }

  /** قراءة المنتجات من مجموعة Firestore products فقط. */
  window.storeGetProducts = async function () {
    if (!firestoreAvailable()) return [];
    try {
      const snap = await window.db.collection('products').orderBy('order', 'asc').get();
      const items = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
      window.storeProductsReady = true;
      return items;
    } catch (e) {
      window.storeProductsReady = false;
      console.warn('Firestore products read failed:', e);
      return [];
    }
  };

  /** حفظ المنتجات في مجموعة products فقط عند استدعاء هذه الواجهة. */
  window.storeSaveProducts = async function (products) {
    if (!firestoreAvailable() || !window.storeProductsReady) return false;
    try {
      if (typeof window.ensureAuthReady === 'function' && !(await window.ensureAuthReady())) {
        throw new Error('Firebase authentication is not available');
      }
      const col = window.db.collection('products');
      const existing = await col.get();
      const batch = window.db.batch();
      const existingIds = new Set(existing.docs.map(doc => doc.id));
      const keepIds = new Set(products.filter(p => p._id).map(p => p._id));
      existing.docs.forEach(doc => {
        if (!keepIds.has(doc.id)) batch.delete(doc.ref);
      });
      products.forEach((p, i) => {
        const ref = p._id ? col.doc(p._id) : col.doc();
        p._id = ref.id;
        const data = {
          name: p.name,
          desc: p.desc,
          price: p.price,
          img: p.img,
          order: i,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (!existingIds.has(ref.id)) data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        batch.set(ref, data, { merge: true });
      });
      await batch.commit();
      return true;
    } catch (e) {
      console.error('Firestore products save failed:', e);
      return false;
    }
  };

  /** متابعة تغييرات مجموعة products فقط. */
  window.storeWatchProducts = function (onChange) {
    if (!firestoreAvailable()) return function () {};
    try {
      return window.db.collection('products').orderBy('order', 'asc')
        .onSnapshot((snap) => {
          const items = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
          window.storeProductsReady = true;
          onChange(items);
        }, (err) => console.warn('products watch error:', err));
    } catch (e) {
      console.warn('products watch setup failed:', e);
      return function () {};
    }
  };
})();
