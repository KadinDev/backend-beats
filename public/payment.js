const buyerNameInput = document.querySelector('#buyerName');
const buyerEmailInput = document.querySelector('#buyerEmail');
const buyerPhoneInput = document.querySelector('#buyerPhone');
const createPaymentButton = document.querySelector('#createPaymentButton');
const paymentStatus = document.querySelector('#paymentStatus');
const pixBox = document.querySelector('#pixBox');
const pixQrImage = document.querySelector('#pixQrImage');
const pixCode = document.querySelector('#pixCode');
const copyPixButton = document.querySelector('#copyPixButton');
const vipCodeBox = document.querySelector('#vipCodeBox');
const vipCode = document.querySelector('#vipCode');
const copyVipButton = document.querySelector('#copyVipButton');

let pollingTimer = null;

function setStatus(message) {
  paymentStatus.textContent = message;
}

async function copyText(text, fallbackMessage) {
  await navigator.clipboard.writeText(text);
  setStatus(fallbackMessage);
}

async function checkOrder(orderId) {
  const response = await fetch(`/api/vip?action=order&id=${encodeURIComponent(orderId)}`);
  const data = await response.json();

  if (!response.ok) {
    setStatus(data.error || 'Nao foi possivel consultar o pagamento.');
    return;
  }

  if (!data.approved) {
    setStatus('Aguardando confirmacao do Pix...');
    return;
  }

  clearInterval(pollingTimer);
  pollingTimer = null;
  pixBox.hidden = true;
  vipCodeBox.hidden = false;
  vipCode.textContent = data.vipCode;
  setStatus('Pagamento aprovado. Codigo VIP liberado.');
}

function startPolling(orderId) {
  clearInterval(pollingTimer);
  checkOrder(orderId);
  pollingTimer = setInterval(() => checkOrder(orderId), 5000);
}

async function createPayment() {
  createPaymentButton.disabled = true;
  vipCodeBox.hidden = true;
  pixBox.hidden = true;
  setStatus('Gerando Pix...');

  try {
    const response = await fetch('/api/vip?action=create-payment', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        buyerName: buyerNameInput.value,
        buyerEmail: buyerEmailInput.value,
        buyerPhone: buyerPhoneInput.value
      })
    });
    const data = await response.json();

    if (!response.ok) {
      setStatus(data.error || 'Nao foi possivel gerar o Pix.');
      return;
    }

    pixQrImage.src = `data:image/png;base64,${data.pixQrCodeBase64}`;
    pixCode.value = data.pixQrCode;
    pixBox.hidden = false;
    setStatus('Pix gerado. Aguardando pagamento...');
    startPolling(data.orderId);
  } catch (error) {
    setStatus(error.message || 'Falha ao gerar Pix.');
  } finally {
    createPaymentButton.disabled = false;
  }
}

createPaymentButton.addEventListener('click', createPayment);
copyPixButton.addEventListener('click', () => copyText(pixCode.value, 'Pix copiado.'));
copyVipButton.addEventListener('click', () => copyText(vipCode.textContent, 'Codigo VIP copiado.'));
