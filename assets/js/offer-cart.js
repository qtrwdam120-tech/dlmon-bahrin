(() => {
  const offer = {
    name: 'خروف نعيمي',
    desc: 'خروف نعيمي واحد · صافي لحم 15–18 كجم · توصيل مجاني إلى المنزل',
    price: '35',
    img: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663883199013/pwrsTGvnRKSeNTHv.jpg',
    qty: 1
  };

  document.querySelectorAll('a[href="/cartepage.html"]').forEach((link) => {
    link.addEventListener('click', () => {
      if (typeof window.CartAdd === 'function') window.CartAdd({ ...offer }, 1);
    });
  });
})();
