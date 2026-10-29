(() => {
  const PRICE = 24.95;
  const config = window.STORE_CONFIG || {};
  const cartDialog = document.querySelector('#cart-dialog');
  const infoDialog = document.querySelector('#info-dialog');
  const money = n => n.toFixed(2) + ' ₾';
  let quantity = 1, cartQuantity = 0, toastTimer;
  try { cartQuantity = Math.min(99, Math.max(0, Number(localStorage.getItem('crystal-cart')) || 0)); } catch {}
  function saveCart() {
    document.querySelectorAll('.cart-count').forEach(el => el.textContent = cartQuantity);
    try { localStorage.setItem('crystal-cart', String(cartQuantity)); } catch {}
  }
  function changeQuantity(delta) {
    quantity = Math.max(1, Math.min(99, quantity + delta));
    document.querySelectorAll('.quantity-value').forEach(el => el.textContent = quantity);
  }
  function renderCart() {
    const content = document.querySelector('#cart-content');
    if (!cartQuantity) {
      content.innerHTML = '<p class="empty-cart">შენი კალათა ჯერ ცარიელია.</p><button class="button primary checkout-button" id="continue-shopping">პროდუქტის ნახვა ↗</button>';
      document.querySelector('#continue-shopping').onclick = () => cartDialog.close();
      return;
    }
    content.innerHTML = `<div class="cart-product"><img src="assets/hero.png" alt="YYLFD საწმენდი სპრეი"><div><h3>ჭაღის საწმენდი სპრეი</h3><p>YYLFD · 100 მლ · ${money(PRICE)}</p><div class="quantity"><button id="cart-minus" aria-label="რაოდენობის შემცირება">−</button><output aria-live="polite">${cartQuantity}</output><button id="cart-plus" aria-label="რაოდენობის გაზრდა">+</button></div></div></div><button class="remove-item" id="remove-item">პროდუქტის ამოღება</button><div class="cart-total"><span>პროდუქტის ჯამი</span><b>${money(PRICE * cartQuantity)}</b></div><p class="delivery-note">მიწოდების საფასური ჯამში არ შედის.</p><div class="checkout-note" id="checkout-note"></div><button class="button primary checkout-button" id="checkout"></button>`;
    document.querySelector('#cart-minus').onclick = () => { cartQuantity = Math.max(0, cartQuantity - 1); saveCart(); renderCart(); };
    document.querySelector('#cart-plus').onclick = () => { cartQuantity = Math.min(99, cartQuantity + 1); saveCart(); renderCart(); };
    document.querySelector('#remove-item').onclick = () => { cartQuantity = 0; saveCart(); renderCart(); };
    const checkout = document.querySelector('#checkout');
    const number = String(config.whatsappNumber || '').replace(/\D/g, '');
    if (number.length >= 9 && config.deliveryDescription && config.merchantName) {
      document.querySelector('#checkout-note').textContent = config.deliveryDescription + ' შეკვეთის მოთხოვნა გაიგზავნება WhatsApp-ში. საბოლოო თანხა და პირობები დასტურდება გამყიდველთან.';
      checkout.textContent = 'შეკვეთის მოთხოვნა WhatsApp-ში ↗';
      checkout.onclick = () => {
        const message = `გამარჯობა! მსურს YYLFD ჭაღის საწმენდი სპრეის შეკვეთა. რაოდენობა: ${cartQuantity}; პროდუქტის ჯამი: ${money(PRICE * cartQuantity)}. გთხოვთ, დამიდასტუროთ ხელმისაწვდომობა, მიწოდების საფასური, ვადა და გადახდის პირობები.`;
        window.open('https://wa.me/' + number + '?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer');
      };
    } else {
      document.querySelector('#checkout-note').textContent = 'მაღაზია მზადების პროცესშია. შეკვეთების მიღება ჯერ არ დაწყებულა. კალათა ინახება მხოლოდ შენს ბრაუზერში; შეკვეთა გამყიდველს არ ეგზავნება.';
      checkout.textContent = 'შეკვეთების მიღება მალე დაიწყება';
      checkout.disabled = true;
    }
  }
  function addToCart() {
    cartQuantity = Math.min(99, cartQuantity + quantity); saveCart(); renderCart(); cartDialog.showModal();
    const toast = document.querySelector('.toast'); toast.textContent = 'პროდუქტი დაემატა კალათაში'; toast.classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 2300);
  }
  document.querySelectorAll('[data-quantity]').forEach(button => button.addEventListener('click', () => changeQuantity(Number(button.dataset.quantity))));
  document.querySelector('#add-to-cart').addEventListener('click', addToCart);
  document.querySelector('[data-mobile-add]').addEventListener('click', addToCart);
  document.querySelectorAll('[data-cart]').forEach(button => button.addEventListener('click', () => {renderCart();cartDialog.showModal();}));
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', e => { if(e.target === dialog) {const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();} }));
  const info = {
    source: ['პროდუქტის წყარო', '<div class="supplier-photo"><img src="assets/temu-product.png" alt="მომწოდებლის ორიგინალი ფოტო — YYLFD სპრეი ჭაღთან"></div><p>მომწოდებლის ორიგინალი ფოტო. პროდუქტი: YYLFD Lighting Renovation, 100 მლ.</p><p>მთავარი პროდუქტის ვიზუალი დამუშავებულია AI-ის დახმარებით. შეფუთვის ზუსტი დეტალებისთვის იხილე მომწოდებლის მასალა.</p><p><a href="https://share.temu.com/NKNulOgv1XB" target="_blank" rel="noopener noreferrer">პროდუქტი Temu-ზე ↗</a></p><p>Crystal Care დამოუკიდებელი მაღაზიის კონცეფციაა და არ წარმოადგენს Temu-ს ან YYLFD-ის ოფიციალურ ვებგვერდს.</p>'],
    privacy: ['კონფიდენციალურობა', '<p>კალათის რაოდენობა ინახება მხოლოდ ამ ბრაუზერის ადგილობრივ მეხსიერებაში. ამ ვერსიაში სახელს, ტელეფონის ნომერსა და მისამართს არ ვაგროვებთ.</p><p>შეკვეთის არხის გააქტიურების შემთხვევაში WhatsApp-ზე გადასვლა გახსნის გარე სერვისს, სადაც მოქმედებს მისი კონფიდენციალურობის წესები. შეტყობინებას თავად აგზავნი.</p><p>შრიფტის ჩასატვირთად გვერდი უკავშირდება Google Fonts-ს; სერვისმა შეიძლება მიიღოს ტექნიკური მოთხოვნის მონაცემები. სარეკლამო ანალიტიკა დამატებული არ არის.</p>'],
    terms: ['შეკვეთის პირობები', '<p>ერთი ბოთლი: 24.95 ₾. ნაჩვენები საწყისი ფასი: 49.50 ₾. მოცულობა: 100 მლ. მიწოდების საფასური არ შედის პროდუქტის ფასში.</p><p>შეკვეთების მიღება გააქტიურდება მას შემდეგ, რაც გამყიდველის ვინაობა, საკონტაქტო ინფორმაცია, მიწოდება, გადახდა და დაბრუნების პირობები დაზუსტდება. ამ ვერსიაში გადახდა და შეკვეთის გაგზავნა ხელმისაწვდომი არ არის.</p><p>შედეგი და თავსებადობა დამოკიდებულია ზედაპირზე და გამოყენებაზე. გამოიყენე მხოლოდ ეტიკეტისა და სანათის მწარმოებლის მითითებების შესაბამისად.</p>']
  };
  document.querySelectorAll('[data-info]').forEach(button => button.addEventListener('click', () => {const item=info[button.dataset.info];document.querySelector('#info-title').textContent=item[0];document.querySelector('#info-content').innerHTML=item[1];infoDialog.showModal();}));
  saveCart();
})();
