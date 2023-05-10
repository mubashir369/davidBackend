
    controller = function(){

        scope.openNav = function(){

            let nav = document.getElementById('nav'),
                body = document.querySelector("html")

            if (nav.classList.contains('open')){
                nav.classList.remove('open')
                body.style.overflow = 'auto'
            } else {
                nav.classList.add('open')
                body.style.overflow = 'hidden'
            }

        }

        var stripe_id = ''
        var stripe_el = document.getElementById('stripe-id')
        if (stripe_el){
            stripe_id = stripe_el.getAttribute('data-stripe-id')
        }
        var stripe = Stripe(stripe_id);
        var elements = stripe.elements();


        // Custom styling can be passed to options when creating an Element.
        var style = {
          base: {
            // Add your base input styles here. For example:
            fontSize: '14px',
            color: '#32325d',
          },
        };

        // Create an instance of the card Element.
        var card = elements.create('card', {style: style});

        // Add an instance of the card Element into the `card-element` <div>.

        var card_el = document.getElementById('card-element')

        if (card_el){
            if (window.innerWidth <= 500) {
              card.update({style: {base: {fontSize: '6.5vw'}}});
            }
            card.mount('#card-element');
        } else {
            return false
        }

        card.addEventListener('change', function(event) {
            var displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
            } else {
                displayError.textContent = '';
            }
        });

        var form = document.getElementById('payment-form');

        form.addEventListener('submit', function(ev) {
            ev.preventDefault();

            var clientSecret = document.getElementById('client_secret').value,
                pay_button = document.getElementById('pay-now'),
                payment_method = {
                    card: card,
                    billing_details: {
                        name: document.getElementById('customer_name').value
                    }
                },
                selected_method = document.querySelector('input[name="payment_method"]:checked'),
                email = document.getElementById('customer_email'),
                tel = document.getElementById('customer_tel')

            if (email && email.value){
                payment_method.billing_details.email = email.value
            }

            if (tel && tel.value){
                payment_method.billing_details.phone = tel.value
            }

            if (selected_method && selected_method.value){
                payment_method = selected_method.value
            }

            pay_button.innerHTML = "Processing..."
            pay_button.disabled = true

            stripe.confirmCardPayment(clientSecret, {
                payment_method: payment_method
            }).then(function(result) {
                if (result.error) {
                    // Show error to your customer (e.g., insufficient funds)
                    console.log(result.error.message);

                    document.getElementById('card-errors').innerHTML = result.error.message
                    pay_button.innerHTML = "Pay Now"
                    pay_button.disabled = false
                } else {
                    // The payment has been processed!
                    if (result.paymentIntent.status === 'succeeded') {
                        window.location.href = '/checkout/stripe/success'
                    }
                }
            });
        });

    }
