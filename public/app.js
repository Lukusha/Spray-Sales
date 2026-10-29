(() => {
  const PRICE = 24.95;
  const checkoutDialog = document.querySelector('#checkout-dialog');
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
      content.innerHTML = '<p class="empty-cart">შენი კალათა ჯერ ცარიელია.</p><button class="button primary checkout-button" id="continue-shopping">პროდუქტის ნახვა </button>';
      document.querySelector('#continue-shopping').onclick = () => cartDialog.close();
      return;
    }
    content.innerHTML = `<div class="cart-product"><img src="assets/hero.png" alt="YYLFD საწმენდი სპრეი"><div><h3>ჭაღის საწმენდი სპრეი</h3><p>YYLFD · 100 მლ · ${money(PRICE)}</p><div class="quantity"><button id="cart-minus" aria-label="რაოდენობის შემცირება">−</button><output aria-live="polite">${cartQuantity}</output><button id="cart-plus" aria-label="რაოდენობის გაზრდა">+</button></div></div></div><button class="remove-item" id="remove-item">პროდუქტის ამოღება</button><div class="cart-total"><span>პროდუქტის ჯამი</span><b>${money(PRICE * cartQuantity)}</b></div><p class="delivery-note">მიწოდების საფასური ჯამში არ შედის.</p><div class="checkout-note" id="checkout-note"></div><button class="button primary checkout-button" id="checkout"></button>`;
    document.querySelector('#cart-minus').onclick = () => { cartQuantity = Math.max(0, cartQuantity - 1); saveCart(); renderCart(); };
    document.querySelector('#cart-plus').onclick = () => { cartQuantity = Math.min(99, cartQuantity + 1); saveCart(); renderCart(); };
    document.querySelector('#remove-item').onclick = () => { cartQuantity = 0; saveCart(); renderCart(); };
    const checkout = document.querySelector('#checkout');
    document.querySelector('#checkout-note').textContent = 'გადაიხადე მიღებისას. რეგისტრაცია არ გჭირდება — მხოლოდ საკონტაქტო და მიწოდების მონაცემები.';
    checkout.textContent = 'შეკვეთის გაფორმება ';
    checkout.onclick = showCheckout;
  }
  function showCheckout() {
    const orderedQuantity = cartQuantity;
    if (!orderedQuantity) return;
    const requestKey = crypto.randomUUID();
    cartDialog.close();
    document.querySelector('#checkout-title').textContent = 'შეკვეთის გაფორმება';
    document.querySelector('#checkout-content').innerHTML = `
      <div class="checkout-progress"><span>✓ კალათა</span><span class="active">02 მიწოდების დეტალები</span></div>
      <form id="order-form">
        <div class="form-grid">
          <label class="full">სახელი და გვარი <span>*</span><input name="customerName" autocomplete="name" required minlength="2" maxlength="100" placeholder="სახელი და გვარი"></label>
          <label class="full">ტელეფონის ნომერი <span>*</span><input name="phone" type="tel" autocomplete="tel" required minlength="9" maxlength="24" placeholder="მაგ. 555 12 34 56"></label>
          <label>ქალაქი / დასახლება <span>*</span><input name="city" autocomplete="address-level2" required minlength="2" maxlength="80" placeholder="მაგ. თბილისი"></label>
          <label>საფოსტო ინდექსი <span>*</span><input name="postalCode" autocomplete="postal-code" inputmode="numeric" pattern="[0-9]{4}" required minlength="4" maxlength="4" placeholder="მაგ. 0100" title="4-ნიშნა საფოსტო ინდექსი"></label>
          <label class="full">მისამართი <span>*</span><input name="address" autocomplete="address-line1" required minlength="5" maxlength="250" placeholder="ქუჩა, სახლის ნომერი"></label>
          <label class="full">ბინა, სართული, სადარბაზო <small>(არასავალდებულო)</small><input name="apartment" autocomplete="address-line2" maxlength="80" placeholder="დამატებითი დეტალები კურიერისთვის"></label>
          <label class="full">კომენტარი <small>(არასავალდებულო)</small><textarea name="notes" maxlength="500" rows="2" placeholder="რაც მიწოდებისას უნდა გავითვალისწინოთ"></textarea></label>
        </div>
        <div class="form-trap" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
        <div class="payment-option"><span class="payment-check">✓</span><div><strong>გადახდა მიღებისას</strong><p>გადაიხდი, როცა პროდუქტს მიიღებ.</p></div><span class="payment-icon">₾</span></div>
        <div class="checkout-summary"><div><span>YYLFD · 100 მლ × ${orderedQuantity}</span><strong>${money(PRICE * orderedQuantity)}</strong></div><div><span>მიწოდება</span><span>დაზუსტდება ტელეფონით</span></div></div>
        <p class="order-disclosure">გაგზავნამდე ტელეფონით დაგიდასტურებთ მიწოდების საფასურს, სრულ თანხასა და ვადას. წინასწარი გადახდა არ გჭირდება.</p>
        <p class="form-error" id="order-error" role="alert" hidden></p>
        <button class="button primary checkout-button" type="submit" id="submit-order">შეკვეთის გაგზავნა </button>
        <p class="data-note">მონაცემებს ვიყენებთ შეკვეთის დასადასტურებლად და მიწოდებისთვის.</p>
        <button type="button" class="back-to-cart" id="back-to-cart"> კალათაში დაბრუნება</button>
      </form>`;
    const form = document.querySelector('#order-form');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const submit = document.querySelector('#submit-order'), error = document.querySelector('#order-error');
      submit.disabled = true; submit.textContent = 'იგზავნება…'; error.hidden = true;
      try {
        const payload = Object.fromEntries(new FormData(form));
        const response = await fetch('/api/orders', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...payload,quantity:orderedQuantity,requestKey}) });
        const result = await response.json();
        if (!response.ok || !/^CC-[A-F0-9]{12}$/.test(result.id || '')) throw new Error(result.error || 'შეკვეთის შენახვა ვერ დადასტურდა. გთხოვ, სცადე ხელახლა.');
        cartQuantity = 0; saveCart();
        document.querySelector('#checkout-title').textContent = 'მოთხოვნა მიღებულია';
        document.querySelector('#checkout-content').innerHTML = `<div class="order-success"><span class="success-check">✓</span><h3>მადლობა შეკვეთისთვის!</h3><p>შენი მოთხოვნა შენახულია.</p><div class="order-reference">შეკვეთის ნომერი<strong>${result.id}</strong></div><p>დაგიკავშირდებით მითითებულ ნომერზე, რომ დავადასტუროთ შეკვეთა, მიწოდების საფასური და ვადა.</p><div class="payment-option"><span class="payment-check">✓</span><div><strong>გადახდა მიღებისას</strong><p>პროდუქტის ჯამი: ${money(result.subtotalTetri / 100)}<br>მიწოდების საფასური დაზუსტდება.</p></div></div><button class="button primary checkout-button" id="finish-order">მთავარ გვერდზე დაბრუნება </button></div>`;
        document.querySelector('#finish-order').onclick = () => checkoutDialog.close();
      } catch (failure) {
        error.textContent = failure instanceof TypeError ? 'კავშირი ვერ დამყარდა. სცადე ხელახლა — განმეორებითი გაგზავნა დუბლირებულ შეკვეთას არ შექმნის.' : failure.message;
        error.hidden = false;
        submit.disabled = false; submit.textContent = 'შეკვეთის გაგზავნა ';
      }
    });
    document.querySelector('#back-to-cart').onclick = () => { checkoutDialog.close(); renderCart(); cartDialog.showModal(); };
    checkoutDialog.showModal();
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
    source: ['პროდუქტის წყარო', '<div class="supplier-photo"><img src="assets/temu-product.png" alt="მომწოდებლის ორიგინალი ფოტო — YYLFD სპრეი ჭაღთან"></div><p>მომწოდებლის ორიგინალი ფოტო. პროდუქტი: YYLFD Lighting Renovation, 100 მლ.</p><p>მთავარი პროდუქტის ვიზუალი დამუშავებულია AI-ის დახმარებით. შეფუთვის ზუსტი დეტალებისთვის იხილე მომწოდებლის მასალა.</p><p><a href="https://share.temu.com/NKNulOgv1XB" target="_blank" rel="noopener noreferrer">პროდუქტი Temu-ზე </a></p><p>Crystal Care დამოუკიდებელი მაღაზიაა და არ წარმოადგენს Temu-ს ან YYLFD-ის ოფიციალურ ვებგვერდს.</p>'],
    privacy: ['კონფიდენციალურობა', '<p>შეკვეთისას ვინახავთ სახელს, ტელეფონს, ქალაქს, მისამართს, საფოსტო ინდექსს, დამატებით დეტალებსა და პროდუქტის რაოდენობას. მონაცემები გამოიყენება შეკვეთის დასადასტურებლად და მიწოდების მოსაწყობად.</p><p>შეკვეთები ინახება მაღაზიის დაცულ ბაზაში. მათი ნახვა შეუძლია მხოლოდ მაღაზიის მფლობელს. კალათის რაოდენობა ინახება შენს ბრაუზერში; საკონტაქტო და მისამართის ველებს ადგილობრივ მეხსიერებაში არ ვინახავთ.</p><p>შრიფტის ჩასატვირთად გვერდი უკავშირდება Google Fonts-ს. სარეკლამო ანალიტიკა დამატებული არ არის.</p>'],
    terms: ['შეკვეთის პირობები', '<p>ერთი ბოთლი: 24.95 ₾. ნაჩვენები საწყისი ფასი: 49.50 ₾. მოცულობა: 100 მლ. მიწოდების საფასური არ შედის პროდუქტის ფასში.</p><p>რეგისტრაცია არ გჭირდება. შეავსე სახელი, ტელეფონი და მისამართი; მოთხოვნა შეინახება მაღაზიაში. გაგზავნამდე ტელეფონით დაგიდასტურებთ ხელმისაწვდომობას, მიწოდების საფასურს, სრულ თანხასა და ვადას. გადახდა ხდება პროდუქტის მიღებისას.</p><p>შედეგი და თავსებადობა დამოკიდებულია ზედაპირზე და გამოყენებაზე. გამოიყენე ეტიკეტისა და სანათის მწარმოებლის მითითებების შესაბამისად.</p>']
  };
  document.querySelectorAll('[data-info]').forEach(button => button.addEventListener('click', () => {const item=info[button.dataset.info];document.querySelector('#info-title').textContent=item[0];document.querySelector('#info-content').innerHTML=item[1];infoDialog.showModal();}));
  saveCart();
})();
