let allProducts = [];

const getElement = (id) => document.getElementById(id);

// Load products from database
async function loadProducts() {
    try {
        const response = await fetch("/api/products");

        if (!response.ok) {
            throw new Error("Failed to load products.");
        }

       
allProducts = await response.json();
filterProducts();
displayRecommendedProducts();

    } catch (error) {
        console.error("Load products error:", error);

        const productList = getElement("product-list");
        if (productList) {
            productList.textContent =
                "Unable to load products. Please try again.";
        }
    }
}

// Display product cards
function displayProducts(
    products,
    targetList = getElement("product-list")
) {
    const productList = targetList;
    if (!productList) return;

    productList.replaceChildren();
    
    if (products.length === 0) {
        productList.textContent = "No products found.";
        return;
    }

    products.forEach(product => {
        const card = document.createElement("article");
        card.className = "product-card";
        
        const availabilityBadge = document.createElement("span");
        const availability = product.availability || "Available";

        availabilityBadge.className =
            "availability-badge " + availability.toLowerCase();

        availabilityBadge.textContent = availability;

const image = document.createElement("img");

const productImages =
    Array.isArray(product.image_urls) && product.image_urls.length > 0
        ? product.image_urls
        : (product.image_url ? [product.image_url] : []);

image.src = productImages[0] ||
    "https://placehold.co/600x400/EEE4D8/70543F?text=ThriftMatch";

image.alt = product.product_name || "Thrift product";
image.loading = "lazy";

        image.onerror = () => {
            image.onerror = null;
            image.src =
                "https://placehold.co/600x400/EEE4D8/70543F?text=ThriftMatch";
        };

        const title = document.createElement("h3");
        title.textContent = product.product_name || "Untitled Product";

        const price = document.createElement("p");
        price.textContent =
            "Price: ₱" + Number(product.price).toFixed(2);

        const size = document.createElement("p");
        size.textContent =
            "Size: " + (product.size || "Not specified");

        const color = document.createElement("p");
        color.textContent =
            "Color: " + (product.color || "Not specified");

        const style = document.createElement("p");
        style.textContent =
            "Style: " + (product.style || "Not specified");

       const actionButtons = document.createElement("div");
actionButtons.className = "product-actions";

const viewButton = document.createElement("button");
        viewButton.type = "button";
        viewButton.textContent = "View Details";
        viewButton.addEventListener("click", () => {
    const manageModal = getElement("manage-products-modal");

    if (manageModal) {
        manageModal.hidden = true;
    }

    showDetails(product);
});

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit Product";
       editButton.addEventListener("click", () => {
    const manageModal = getElement("manage-products-modal");

    if (manageModal) {
        manageModal.hidden = true;
    }

    openEditForm(product);
});

        
const deleteButton = document.createElement("button");
deleteButton.type = "button";
deleteButton.textContent = "Delete Product";

deleteButton.addEventListener("click", async () => {
    const confirmed = confirm(
        `Are you sure you want to delete "${product.product_name}"?`
    );

    if (!confirmed) return;

    try {
        const response = await fetch(
    "/api/products/" + product.id,
    {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${window.thriftMatchToken}`
        }
    }
);

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Failed to delete product."
            );
        }

        alert(result.message || "Product deleted successfully!");

        await loadProducts();
    } catch (error) {
        console.error("Delete product error:", error);
        alert(error.message || "Unable to delete product.");
    }
});

        

              console.log("Product user_id:", product.user_id);
console.log("Logged-in user ID:", window.thriftMatchUserId);

const isOwner =
    Number(product.user_id) === Number(window.thriftMatchUserId);

console.log("Is owner:", isOwner);

card.append(
    image,
    title,
    price,
    availabilityBadge,
    size,
    color,
    style
);

actionButtons.appendChild(viewButton);

if (isOwner) {
    actionButtons.appendChild(editButton);
    actionButtons.appendChild(deleteButton);
}

card.appendChild(actionButtons);

        productList.appendChild(card);
    });
}
// Show product details



function showDetails(product) {
    const details = getElement("details-content");
    const modal = getElement("product-details");

    if (!details || !modal) return;

    details.replaceChildren();

    // Get all uploaded product images.
    const imageUrls =
        product.image_urls && product.image_urls.length > 0
            ? product.image_urls
            : (product.image_url ? [product.image_url] : []);

    // Main product details layout.
    const layout = document.createElement("div");
    layout.className = "details-layout";

    // LEFT SIDE: Product image gallery.
    const gallery = document.createElement("div");
    gallery.className = "product-image-gallery";

    if (imageUrls.length > 0) {
    let currentIndex = 0;

    const imageViewer = document.createElement("div");
    imageViewer.className = "product-image-viewer";

    const mainImage = document.createElement("img");
    mainImage.className = "product-main-image";
    mainImage.src = imageUrls[0];
    mainImage.alt = product.product_name || "Product image";

    const counter = document.createElement("span");
    counter.className = "product-image-counter";
    counter.textContent = `1 / ${imageUrls.length}`;

    const prevButton = document.createElement("button");
    prevButton.type = "button";
    prevButton.className = "product-image-arrow prev";
    prevButton.textContent = "‹";
    prevButton.setAttribute("aria-label", "Previous image");

    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.className = "product-image-arrow next";
    nextButton.textContent = "›";
    nextButton.setAttribute("aria-label", "Next image");

    imageViewer.append(
        mainImage,
        counter,
        prevButton,
        nextButton
    );

    gallery.appendChild(imageViewer);

    const thumbnails = document.createElement("div");
    thumbnails.className = "product-image-thumbnails";

    const thumbnailButtons = [];

    function showImage(index) {
        currentIndex =
            (index + imageUrls.length) % imageUrls.length;

        mainImage.src = imageUrls[currentIndex];
        mainImage.alt =
            `${product.product_name || "Product"} image ${currentIndex + 1}`;

        counter.textContent =
            `${currentIndex + 1} / ${imageUrls.length}`;

        thumbnailButtons.forEach((button, i) => {
            button.classList.toggle("active", i === currentIndex);
        });
    }

    imageUrls.forEach((url, index) => {
        const thumbnail = document.createElement("button");
        thumbnail.type = "button";
        thumbnail.className = "product-thumbnail";
        thumbnail.setAttribute(
            "aria-label",
            `View product image ${index + 1}`
        );

        const image = document.createElement("img");
        image.src = url;
        image.alt = `Product image ${index + 1}`;
        image.loading = "lazy";

        thumbnail.appendChild(image);
        thumbnail.addEventListener("click", () => showImage(index));

        thumbnailButtons.push(thumbnail);
        thumbnails.appendChild(thumbnail);
    });

    prevButton.addEventListener("click", () => {
        showImage(currentIndex - 1);
    });

    nextButton.addEventListener("click", () => {
        showImage(currentIndex + 1);
    });

    gallery.appendChild(thumbnails);
    showImage(0);
} else {
    const noImage = document.createElement("p");
    noImage.className = "no-product-image";
    noImage.textContent = "No product images available.";
    gallery.appendChild(noImage);
}
    layout.appendChild(gallery);

    // RIGHT SIDE: Product information.
    const info = document.createElement("div");
    info.className = "product-details-info";

    const eyebrow = document.createElement("p");
    eyebrow.className = "details-eyebrow";
    eyebrow.textContent = "THRIFTMATCH FINDS";

    const title = document.createElement("h2");
    title.className = "details-product-name";
    title.textContent = product.product_name || "Untitled Product";

    const price = document.createElement("p");
    price.className = "details-product-price";
    price.textContent = "₱" + Number(product.price || 0).toFixed(2);

    const availability = document.createElement("span");
    const status = (product.availability || "Available").toLowerCase();

    availability.className = "availability-badge " +
        (["available", "pending", "sold"].includes(status)
            ? status
            : "available");

    availability.textContent = product.availability || "Available";

    const seller = document.createElement("p");
    seller.className = "details-seller";

    const sellerLabel = document.createElement("strong");
    sellerLabel.textContent = "Seller: ";

    seller.append(
        sellerLabel,
        document.createTextNode(
            product.seller_name || "Seller information unavailable"
        )
    );

    const attributes = document.createElement("div");
    attributes.className = "details-attributes";

    [
        ["Size", product.size],
        ["Color", product.color],
        ["Style", product.style]
    ].forEach(([label, value]) => {
        const item = document.createElement("div");
        item.className = "details-attribute";

        const heading = document.createElement("span");
        heading.textContent = label;

        const valueText = document.createElement("strong");
        valueText.textContent = value || "Not specified";

        item.append(heading, valueText);
        attributes.appendChild(item);
    });

    const descriptionSection = document.createElement("div");
    descriptionSection.className = "details-description";

    const descriptionTitle = document.createElement("h3");
    descriptionTitle.textContent = "Description";

    const description = document.createElement("p");
    description.textContent =
        product.description || "No description provided.";

    descriptionSection.append(descriptionTitle, description);

    // Message Seller button
const messageSellerButton = document.createElement("button");
messageSellerButton.type = "button";
messageSellerButton.textContent = "Message Seller";
messageSellerButton.className = "primary";

messageSellerButton.addEventListener("click", async () => {
    if (!window.thriftMatchToken) {
        alert("Please log in first to message the seller.");
        return;
    }

    if (Number(window.thriftMatchUserId) === Number(product.user_id)) {
        alert("You cannot message yourself.");
        return;
    }

    try {
        const response = await fetch("/api/chats", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${window.thriftMatchToken}`
            },
            body: JSON.stringify({
                product_id: product.id
            })
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.message || "Unable to start chat.");
            return;
        }

       currentChatId = result.chatId;

       // Set the chat header when messaging the seller directly
const contactName = getElement("chat-contact-name");
const productName = getElement("chat-product-name");

if (contactName) {
    contactName.textContent = seller.textContent.replace(/^Seller:\s*/i, "").trim();
}

if (productName) {
    productName.textContent = title.textContent;
}

// Close Product Details first
const productDetailsModal = getElement("product-details");

if (productDetailsModal) {
    productDetailsModal.hidden = true;
}

// Open the messages inbox
const inbox = getElement("chat-inbox-modal");

if (inbox) {
    inbox.hidden = false;
}

await loadChatInbox();

// Open the selected conversation
const chatModal = getElement("chat-modal");

if (chatModal) {
    chatModal.hidden = false;
}

// Load the messages for this conversation
await loadChatMessages();

// Focus the message input
const messageInput = getElement("chat-message-input");

if (messageInput) {
    messageInput.focus();
}

    } catch (error) {
        alert("Unable to connect to the server. Please try again.");
    }
});

info.append(
    eyebrow,
    title,
    price,
    availability,
    seller,
    attributes,
    descriptionSection,
    messageSellerButton
);

    layout.appendChild(info);
    details.appendChild(layout);

    modal.hidden = false;
    displayRecommendedProducts(product);
}


let currentChatId = null;

async function loadChatMessages() {
    const messagesContainer = getElement("chat-messages");
    const status = getElement("chat-status");

    if (!currentChatId || !messagesContainer) return;

    try {
        const response = await fetch(
            `/api/chats/${currentChatId}/messages`,
            {
                headers: {
                    Authorization: `Bearer ${window.thriftMatchToken}`
                }
            }
        );

        const messages = await response.json();

        if (!response.ok) {
            throw new Error(messages.message || "Unable to load messages.");
        }

        messagesContainer.replaceChildren();

        if (messages.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.textContent = "No messages yet. Say hello!";
            messagesContainer.appendChild(emptyMessage);
        }

       
messages.forEach(message => {
    const row = document.createElement("div");
    const isMine =
        Number(message.sender_id) === Number(window.thriftMatchUserId);

    row.className = isMine
        ? "chat-message chat-message-mine"
        : "chat-message chat-message-other";

    const bubble = document.createElement("p");
    bubble.textContent = message.message_text;

    const sender = document.createElement("span");
    sender.className = "chat-sender";
    sender.textContent = isMine ? "You" : message.sender_name;

    row.appendChild(sender);
    row.appendChild(bubble);
    messagesContainer.appendChild(row);
});


        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        if (status) status.textContent = "";
    } catch (error) {
        if (status) status.textContent = error.message;
    }
}


// CHAT INBOX
async function loadChatInbox(showLoading = true) {
    const list = getElement("chat-inbox-list");
    const status = getElement("chat-inbox-status");

    if (!list) return;

    if (showLoading) {
    list.innerHTML = "<p>Loading conversations...</p>";
}

    try {
        const response = await fetch("/api/chats", {
            headers: {
                "Authorization": `Bearer ${window.thriftMatchToken}`
            }
        });

        const chats = await response.json();

        if (!response.ok) {
            throw new Error(
                chats.message || "Unable to load messages."
            );
        }

        list.innerHTML = "";

        if (chats.length === 0) {
            list.innerHTML = "<p>No conversations yet.</p>";
            return;
        }

chats.forEach(chat => {
    const row = document.createElement("div");
    row.className = "chat-inbox-row";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "chat-inbox-item";

            const otherName =
                Number(chat.buyer_id) === Number(window.thriftMatchUserId)
                    ? chat.seller_name
                    : chat.buyer_name;

            
const thumbnail = document.createElement("img");
thumbnail.className = "chat-product-thumbnail";
thumbnail.alt = "";
thumbnail.loading = "lazy";

if (chat.image_url) {
    thumbnail.src = chat.image_url;
} else {
    thumbnail.hidden = true;
}

const content = document.createElement("div");
content.className = "chat-inbox-content";

const title = document.createElement("strong");
title.textContent =
    otherName + " · " + chat.product_name;

const preview = document.createElement("span");
preview.className = "chat-preview";
preview.textContent =
    chat.last_message || "No messages yet";

const time = document.createElement("small");
time.className = "chat-time";


const unreadBadge = document.createElement("span");
unreadBadge.className = "unread-badge";

const unreadCount = Number(chat.unread_count) || 0;

if (unreadCount > 0) {
    unreadBadge.textContent =
        unreadCount > 99 ? "99+" : String(unreadCount);
    unreadBadge.setAttribute(
        "aria-label",
        `${unreadCount} unread messages`
    );
} else {
    unreadBadge.hidden = true;
}


if (chat.last_message_at) {
    time.textContent = new Date(
        chat.last_message_at
    ).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    });
}

content.appendChild(title);
content.appendChild(preview);
content.appendChild(time);
content.appendChild(unreadBadge);

button.appendChild(thumbnail);
button.appendChild(content);



            
button.addEventListener("click", async () => {
    window.currentChatId = chat.chat_id;
    currentChatId = chat.chat_id;

    // Display the other user's name and product name
    const contactName = getElement("chat-contact-name");
    const productName = getElement("chat-product-name");

    if (contactName) {
        contactName.textContent = otherName || "Conversation";
    }

    if (productName) {
        const itemName = chat.product_name || "ThriftMatch messages";
        const itemPrice = Number(chat.price);

        productName.textContent =
            chat.price !== null && chat.price !== undefined && chat.price !== ""
                ? `${itemName} · ₱${itemPrice.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}`
                : itemName;
    }

    const inbox = getElement("chat-inbox-modal");
    const chatModal = getElement("chat-modal");

    if (inbox) inbox.hidden = false;
    if (chatModal) chatModal.hidden = false;

    try {
        const response = await fetch(
            `/api/chats/${chat.chat_id}/read`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${window.thriftMatchToken}`
                }
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to mark messages as read.");
        }

        await loadChatMessages();
        await loadChatInbox();

    } catch (error) {
        console.error("Error opening conversation:", error.message);
        await loadChatMessages();
    }
});

const deleteButton = document.createElement("button");
deleteButton.type = "button";
deleteButton.className = "delete-chat-button";
deleteButton.textContent = "⋮";
deleteButton.setAttribute("aria-label", "Delete conversation");

deleteButton.addEventListener("click", async (event) => {
    event.stopPropagation();

    const confirmed = confirm(
        "Delete this conversation from your inbox?"
    );

    if (!confirmed) return;

    try {
        const response = await fetch(`/api/chats/${chat.chat_id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${window.thriftMatchToken}`
            }
        });

        const result = await response.json();

       if (!response.ok) {
    throw new Error(result.message || "Failed to hide conversation.");
}

// Close the chat if the deleted conversation is currently open
if (Number(currentChatId) === Number(chat.chat_id)) {
    currentChatId = null;
    window.currentChatId = null;

    const messagesContainer = getElement("chat-messages");
    const status = getElement("chat-status");
    const contactName = getElement("chat-contact-name");
    const productName = getElement("chat-product-name");
    const chatModal = getElement("chat-modal");

    if (messagesContainer) {
        messagesContainer.replaceChildren();
    }

    if (status) status.textContent = "";
    if (contactName) contactName.textContent = "";
    if (productName) productName.textContent = "";

    if (chatModal) {
        chatModal.hidden = true;
    }
}

await loadChatInbox();
    } catch (error) {
        alert(error.message);
    }
});

row.appendChild(button);
row.appendChild(deleteButton);
list.appendChild(row);
        });

        if (status) status.textContent = "";

    } catch (error) {
        list.innerHTML = "";

        if (status) {
            status.textContent = error.message;
        }
    }
}

// ===== AUTOMATIC CHAT REFRESH =====

setInterval(async () => {
    if (!window.thriftMatchToken) return;

    const inbox = getElement("chat-inbox-modal");
    const chatModal = getElement("chat-modal");

    // Refresh inbox when open
    if (inbox && !inbox.hidden) {
        await loadChatInbox(false);
    }

    // Refresh messages when conversation is open
    if (chatModal && !chatModal.hidden && currentChatId) {
        await loadChatMessages();
    }

}, 3000);

// OPEN MESSAGES INBOX
const messagesButton = getElement("messages-button");

if (messagesButton) {
    messagesButton.addEventListener("click", async () => {
        if (!window.thriftMatchToken) {
            alert("Please log in first to view your messages.");
            return;
        }

        const inbox = getElement("chat-inbox-modal");

        if (inbox) {
            inbox.hidden = false;
        }

        await loadChatInbox();
    });
}

// CLOSE MESSAGES INBOX
const closeChatInboxButton = getElement("close-chat-inbox");

if (closeChatInboxButton) {
    closeChatInboxButton.addEventListener("click", () => {
        const inbox = getElement("chat-inbox-modal");

        if (inbox) {
            inbox.hidden = true;
        }
    });
}

const chatInboxModal = getElement("chat-inbox-modal");

if (chatInboxModal) {
    chatInboxModal.addEventListener("click", event => {
        if (event.target === chatInboxModal) {
            chatInboxModal.hidden = true;
        }
    });
}

const closeChatButton = getElement("close-chat");

if (closeChatButton) {
    closeChatButton.addEventListener("click", () => {
        const chatModal = getElement("chat-modal");

        if (chatModal) {
            chatModal.hidden = true;
        }
    });
}


const chatForm = getElement("chat-form");

if (chatForm) {
    chatForm.addEventListener("submit", async event => {
        event.preventDefault();

        const input = getElement("chat-message-input");
        const status = getElement("chat-status");

        if (!currentChatId || !input || !input.value.trim()) {
            return;
        }

        const message = input.value.trim();

        try {
            const response = await fetch(
                `/api/chats/${currentChatId}/messages`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${window.thriftMatchToken}`
                    },
                    body: JSON.stringify({
                        message_text: message
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Unable to send message.");
            }

           input.value = "";
if (status) status.textContent = "Message sent!";

await loadChatMessages();
await loadChatInbox();
        } catch (error) {
            if (status) status.textContent = error.message;
        }
    });
}


let editImageUrls = [];

function syncEditImageUrls() {
    const textarea = getElement("edit-product-images");

    if (textarea) {
        textarea.value = editImageUrls
            .map(url => url.trim())
            .filter(url => url !== "")
            .join("\n");
    }
}


let currentEditImageIndex = 0;

function showEditImagePreview(index) {
    const urls = editImageUrls.filter(url => url.trim() !== "");
    if (urls.length === 0) return;

    currentEditImageIndex = (index + urls.length) % urls.length;

    const modal = getElement("edit-image-preview-modal");
    const image = getElement("edit-image-preview-large");
    const counter = getElement("edit-image-preview-count");

    if (!modal || !image || !counter) return;

    image.src = urls[currentEditImageIndex];
    counter.textContent =
        `Photo ${currentEditImageIndex + 1} of ${urls.length}`;

    modal.hidden = false;
}

function closeEditImagePreview() {
    const modal = getElement("edit-image-preview-modal");
    const image = getElement("edit-image-preview-large");

    if (modal) modal.hidden = true;
    if (image) image.src = "";
}

const closeEditPreviewButton =
    getElement("close-edit-image-preview");

const previousEditPreviewButton =
    getElement("previous-edit-image");

const nextEditPreviewButton =
    getElement("next-edit-image");

const editPreviewModal =
    getElement("edit-image-preview-modal");

if (closeEditPreviewButton) {
    closeEditPreviewButton.addEventListener(
        "click",
        closeEditImagePreview
    );
}

if (previousEditPreviewButton) {
    previousEditPreviewButton.addEventListener("click", () => {
        showEditImagePreview(currentEditImageIndex - 1);
    });
}

if (nextEditPreviewButton) {
    nextEditPreviewButton.addEventListener("click", () => {
        showEditImagePreview(currentEditImageIndex + 1);
    });
}

if (editPreviewModal) {
    editPreviewModal.addEventListener("click", event => {
        if (event.target === editPreviewModal) {
            closeEditImagePreview();
        }
    });
}


function renderEditImageList() {
    const list = getElement("edit-product-image-list");
    if (!list) return;

    list.innerHTML = "";

    editImageUrls.forEach((url, index) => {
        const card = document.createElement("div");
        card.className = "edit-photo-card";

        const imageBox = document.createElement("div");
        imageBox.className = "edit-photo-image-box";

        if (url.trim()) {
            const image = document.createElement("img");
            image.className = "edit-image-thumbnail";
            image.src = url.trim();
            image.alt = `Product photo ${index + 1}`;

            image.addEventListener("error", () => {
                imageBox.classList.add("image-unavailable");
                image.alt = "Image unavailable";
            });

            image.addEventListener("click", () => {
                const validIndex = editImageUrls
                    .slice(0, index)
                    .filter(item => item.trim() !== "")
                    .length;

                showEditImagePreview(validIndex);
            });

            imageBox.appendChild(image);
        } else {
            imageBox.classList.add("empty-photo");
            imageBox.textContent = "＋";
        }

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "edit-photo-remove";
        removeButton.textContent = "×";
        removeButton.setAttribute("aria-label", `Remove photo ${index + 1}`);

        removeButton.addEventListener("click", () => {
            editImageUrls.splice(index, 1);
            renderEditImageList();
            syncEditImageUrls();
        });

        imageBox.appendChild(removeButton);

        const photoLabel = document.createElement("p");
        photoLabel.className = "edit-photo-label";
        photoLabel.textContent = index === 0
            ? "Main Photo"
            : `Photo ${index + 1}`;

        const editUrlButton = document.createElement("button");
        editUrlButton.type = "button";
        editUrlButton.className = "edit-photo-url-button";
        editUrlButton.textContent = "Edit URL";

        const urlInput = document.createElement("input");
        urlInput.type = "url";
        urlInput.className = "edit-photo-url-input";
        urlInput.placeholder = "Paste image URL";
        urlInput.value = url;
        urlInput.hidden = true;

        editUrlButton.addEventListener("click", () => {
            urlInput.hidden = !urlInput.hidden;

            if (!urlInput.hidden) {
                urlInput.focus();
            }
        });

        urlInput.addEventListener("input", () => {
            editImageUrls[index] = urlInput.value;
            syncEditImageUrls();

            const newUrl = urlInput.value.trim();
            let image = imageBox.querySelector("img");

            if (newUrl && !image) {
                image = document.createElement("img");
                image.className = "edit-image-thumbnail";
                image.alt = `Product photo ${index + 1}`;

                image.addEventListener("click", () => {
                    const validIndex = editImageUrls
                        .slice(0, index)
                        .filter(item => item.trim() !== "")
                        .length;

                    showEditImagePreview(validIndex);
                });

                imageBox.textContent = "";
                imageBox.classList.remove("empty-photo", "image-unavailable");
                imageBox.appendChild(image);
                imageBox.appendChild(removeButton);
            }

            if (image) {
                image.src = newUrl;
                image.hidden = !newUrl;
            }

            if (!newUrl) {
                imageBox.classList.add("empty-photo");
            } else {
                imageBox.classList.remove("empty-photo");
            }
        });

        card.append(imageBox, photoLabel, editUrlButton, urlInput);
        list.appendChild(card);
    });

    if (editImageUrls.length < 10) {
        const addCard = document.createElement("button");
        addCard.type = "button";
        addCard.className = "edit-photo-add-card";
        addCard.innerHTML = "<span>＋</span><small>Add Photo</small>";

        addCard.addEventListener("click", () => {
            if (editImageUrls.length >= 10) return;

            editImageUrls.push("");
            renderEditImageList();
            syncEditImageUrls();
        });

        list.appendChild(addCard);
    }
}

const addEditImageButton = getElement("add-edit-product-image");

if (addEditImageButton) {
    addEditImageButton.addEventListener("click", () => {
        if (editImageUrls.length >= 10) return;

        editImageUrls.push("");
        renderEditImageList();
        syncEditImageUrls();
    });
}

function openEditForm(product) {
    const editSection = getElement("edit-product-section");
    const editForm = getElement("edit-product-form");

    if (!editSection || !editForm) return;

    editForm.reset();

    getElement("edit-product-id").value = product.id;
    getElement("edit-product-name").value = product.product_name || "";
    getElement("edit-product-price").value = product.price;
    getElement("edit-product-size").value = product.size || "";
    getElement("edit-product-color").value = product.color || "";
    getElement("edit-product-style").value = product.style || "";
   editImageUrls = (
    product.image_urls && product.image_urls.length > 0
        ? product.image_urls
        : (product.image_url ? [product.image_url] : [])
).slice(0, 10);

renderEditImageList();
syncEditImageUrls();
    getElement("edit-product-description").value =
        product.description || "";
    getElement("edit-product-availability").value = product.availability;
    getElement("edit-message").textContent = "";

    editSection.hidden = false;
}


 // Back from product details
const backButton = getElement("back-button");
const productDetailsModal = getElement("product-details");

if (backButton && productDetailsModal) {
    backButton.addEventListener("click", () => {
        productDetailsModal.hidden = true;
    });

    productDetailsModal.addEventListener("click", (event) => {
        if (event.target === productDetailsModal) {
            productDetailsModal.hidden = true;
        }
    });
}


// Search and filters
const searchInput = getElement("search-input");
const sizeFilter = getElement("size-filter");
const colorFilter = getElement("color-filter");
const styleFilter = getElement("style-filter");
const minPriceFilter = getElement("min-price");
const maxPriceFilter = getElement("max-price");

function filterProducts() {
    if (!searchInput || !sizeFilter || !colorFilter ||
        !styleFilter || !minPriceFilter || !maxPriceFilter) {
        return;
    }

    const searchText = searchInput.value.trim().toLowerCase();
    const selectedSize = sizeFilter.value;
    const selectedColor = colorFilter.value;
    const selectedStyle = styleFilter.value;
    const minPrice = minPriceFilter.value;
    const maxPrice = maxPriceFilter.value;

    const filtered = allProducts.filter(product => {
        const name = (product.product_name || "").toLowerCase();
        const description = (product.description || "").toLowerCase();
        const color = (product.color || "").toLowerCase();
        const style = product.style || "";
        const price = Number(product.price);

        const matchesSearch =
            name.includes(searchText) ||
            description.includes(searchText) ||
            color.includes(searchText) ||
            style.toLowerCase().includes(searchText);

        return matchesSearch &&
            (!selectedSize || product.size === selectedSize) &&
            (!selectedColor || color === selectedColor.toLowerCase()) &&
            (!selectedStyle || style === selectedStyle) &&
            (!minPrice || price >= Number(minPrice)) &&
            (!maxPrice || price <= Number(maxPrice));
    });

    
    displayProducts(filtered);
    displayRecommendedProducts();
}

if (searchInput) {
    searchInput.addEventListener("input", filterProducts);
}

if (sizeFilter) {
    sizeFilter.addEventListener("change", filterProducts);
}

if (colorFilter) {
    colorFilter.addEventListener("change", filterProducts);
}

if (styleFilter) {
    styleFilter.addEventListener("change", filterProducts);
}

if (minPriceFilter) {
    minPriceFilter.addEventListener("change", filterProducts);
}

if (maxPriceFilter) {
    maxPriceFilter.addEventListener("change", filterProducts);
}


// Add product
const addProductForm = getElement("add-product-form");

if (addProductForm) {
    addProductForm.addEventListener("submit", async event => {
    event.preventDefault();

    const imageUrls = getElement("product-images").value
        .split("\n")
        .map(url => url.trim())
        .filter(url => url !== "");

    const message = getElement("form-message");

    if (imageUrls.length > 10) {
        message.textContent = "Maximum of 10 image URLs allowed.";
        return;
    }

    const product = {
        product_name: getElement("product-name").value.trim(),
        price: getElement("product-price").value,
        size: getElement("product-size").value,
        color: getElement("product-color").value.trim(),
        style: getElement("product-style").value,
        image_urls: imageUrls,
        description: getElement("product-description").value.trim()
    };

    message.textContent = "Saving product...";

    try {
        const response = await fetch("/api/products", {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
                "Authorization": `Bearer ${window.thriftMatchToken}`
            },
            body: JSON.stringify(product)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to add product.");
        }

        getElement("add-product-form").reset();
        message.textContent = result.message || "Product added successfully.";

        await loadProducts();

       if (addProductModal) {
    addProductModal.hidden = true;
}
      } catch (error) {
        message.textContent = error.message;
        console.error("Add product error:", error);
    }
    });
}


// Edit and save product
const editProductForm = getElement("edit-product-form");

if (editProductForm) {
    editProductForm.addEventListener("submit", async event => {

    event.preventDefault();

    const productId = getElement("edit-product-id").value;
    const message = getElement("edit-message");

    const imageUrls = getElement("edit-product-images").value
        .split("\n")
        .map(url => url.trim())
        .filter(url => url !== "");

    if (imageUrls.length > 10) {
        message.textContent = "Maximum of 10 image URLs allowed.";
        return;
    }

    const updatedProduct = {
        product_name: getElement("edit-product-name").value.trim(),
        price: getElement("edit-product-price").value,
        size: getElement("edit-product-size").value,
        color: getElement("edit-product-color").value.trim(),
        style: getElement("edit-product-style").value,
               image_urls: imageUrls,
        description: getElement("edit-product-description").value.trim(),
        availability: getElement("edit-product-availability").value
    };

    message.textContent = "Saving changes...";

    try {
        const response = await fetch("/api/products/" + productId, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${window.thriftMatchToken}`
            },
            body: JSON.stringify(updatedProduct)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to update product.");
        }

        await loadProducts();

        getElement("edit-product-form").reset();
        message.textContent = "";
        getElement("edit-product-section").hidden = true;
        getElement("product-details").hidden = true;
        getElement("product-list").hidden = false;

        window.scrollTo({ top: 0, behavior: "smooth" });
  
    } catch (error) {
        message.textContent = error.message;
        console.error("Edit product error:", error);
    }
    });
}



function closeEditModal() {
    const editSection = getElement("edit-product-section");
    const editForm = getElement("edit-product-form");
    const editMessage = getElement("edit-message");

    if (!editSection) return;

    editSection.hidden = true;

    if (editForm) {
        editForm.reset();
    }

    if (editMessage) {
        editMessage.textContent = "";
    }
}

// Cancel and close buttons
const cancelEditButton = getElement("cancel-edit-button");
const cancelEditButtonForm = getElement("cancel-edit-button-form");
const editProductModal = getElement("edit-product-section");

if (cancelEditButton) {
    cancelEditButton.addEventListener("click", closeEditModal);
}

if (cancelEditButtonForm) {
    cancelEditButtonForm.addEventListener("click", closeEditModal);
}

if (editProductModal) {
    editProductModal.addEventListener("click", event => {
        if (event.target === editProductModal) {
            closeEditModal();
        }
    });
}


// Start application
loadProducts();


/* ===== REGISTER ACCOUNT ===== */

const registerForm = getElement("register-form");

if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const message = getElement("register-message");
        const button = registerForm.querySelector('button[type="submit"]');

        
const password = getElement("register-password").value;
const confirmPassword = getElement("register-confirm-password").value;

if (password !== confirmPassword) {
    message.textContent = "Passwords do not match. Please try again.";
    getElement("register-confirm-password").focus();
    return;
}
const user = {
    full_name: getElement("register-name").value.trim(),
    email: getElement("register-email").value.trim(),
    password: getElement("register-password").value,
    role: getElement("register-role").value
    
};

console.log("Selected account role:", user.role)

        message.textContent = "Creating your account...";
        button.disabled = true;

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(user)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Registration failed."
                );
            }

           message.textContent =
    "Account created successfully! You can now log in.";

registerForm.reset();

getElement("login-email").value = user.email;

// Automatically close the account modal after successful registration.
if (accountModal) {
    accountModal.hidden = true;
}

        } catch (error) {
            message.textContent =
                error.message || "Unable to register. Please try again.";

            console.error("Registration error:", error);
        } finally {
            button.disabled = false;
        }
    });
}


/* ===== LOG IN ===== */

const loginForm = getElement("login-form");


/* ===== SHOW / HIDE LOGIN PASSWORD ===== */

const loginPassword = getElement("login-password");
const toggleLoginPassword = getElement("toggle-login-password");


/* ===== SHOW / HIDE SIGN UP PASSWORD ===== */

const registerPassword = getElement("register-password");
const toggleRegisterPassword = getElement("toggle-register-password");

if (registerPassword && toggleRegisterPassword) {
    toggleRegisterPassword.addEventListener("click", () => {
        const isPasswordHidden = registerPassword.type === "password";

        registerPassword.type = isPasswordHidden ? "text" : "password";
        toggleRegisterPassword.setAttribute(
            "aria-label",
            isPasswordHidden ? "Hide password" : "Show password"
        );
        toggleRegisterPassword.setAttribute(
            "aria-pressed",
            String(isPasswordHidden)
        );
    });
}


/* ===== SHOW / HIDE CONFIRM PASSWORD ===== */

const registerConfirmPassword = getElement("register-confirm-password");
const toggleRegisterConfirmPassword = getElement("toggle-register-confirm-password");

if (registerConfirmPassword && toggleRegisterConfirmPassword) {
    toggleRegisterConfirmPassword.addEventListener("click", () => {
        const isPasswordHidden =
            registerConfirmPassword.type === "password";

        registerConfirmPassword.type =
            isPasswordHidden ? "text" : "password";

        toggleRegisterConfirmPassword.setAttribute(
            "aria-label",
            isPasswordHidden ? "Hide confirm password" : "Show confirm password"
        );

        toggleRegisterConfirmPassword.setAttribute(
            "aria-pressed",
            String(isPasswordHidden)
        );
    });
}

if (loginPassword && toggleLoginPassword) {
    toggleLoginPassword.addEventListener("click", () => {
        const isPasswordHidden = loginPassword.type === "password";

        loginPassword.type = isPasswordHidden ? "text" : "password";
        toggleLoginPassword.textContent = isPasswordHidden ? "Hide" : "Show";
        toggleLoginPassword.setAttribute(
            "aria-label",
            isPasswordHidden ? "Hide password" : "Show password"
        );
        toggleLoginPassword.setAttribute(
            "aria-pressed",
            String(isPasswordHidden)
        );
    });
}


if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const message = getElement("login-message");
        const button = loginForm.querySelector('button[type="submit"]');

        const credentials = {
            email: getElement("login-email").value.trim(),
            password: getElement("login-password").value
        };

        message.textContent = "Logging in...";
        button.disabled = true;

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(credentials)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Login failed."
                );
            }

            // Keep the token in memory for this page session.
            window.thriftMatchToken = result.token;
            window.thriftMatchUserId = result.user.id;
            window.thriftMatchUserRole = result.user.role;

            // Show Seller Management Banner only for sellers
const sellerBanner = getElement("seller-banner");

if (sellerBanner) {
    sellerBanner.hidden =
        window.thriftMatchUserRole !== "seller";
}

            const addProductButton = getElement("add-product-button");

if (addProductButton) {
    addProductButton.hidden = window.thriftMatchUserRole !== "seller";
}

            console.log("User saved after login:", window.thriftMatchUserId);
            await loadProducts();

            const welcomeMessage = getElement("welcome-message");

if (welcomeMessage) {
    welcomeMessage.textContent =
        "Welcome back, " + result.user.full_name + "! Happy thrifting! ♡";

    welcomeMessage.hidden = false;
}

           message.textContent =
    "Welcome, " + result.user.full_name + "! Login successful.";

loginForm.reset();

// Automatically close the account modal after successful login.
if (accountModal) {
    accountModal.hidden = true;
}

            console.log("ThriftMatch login successful.");

        } catch (error) {
            message.textContent =
                error.message || "Unable to log in. Please try again.";

            console.error("Login error:", error);
        } finally {
            button.disabled = false;
        }
    });
}

// ===== ACCOUNT MODAL =====

const accountButton = document.getElementById("account-button");
const accountModal = document.getElementById("account-modal");

if (accountButton && accountModal) {
    accountButton.addEventListener("click", () => {
        accountModal.hidden = false;
    });

    accountModal.addEventListener("click", (event) => {
        if (event.target === accountModal) {
            accountModal.hidden = true;
        }
    });
}

// ===== ACCOUNT FORM SWITCHING =====

const closeAccountModal = document.getElementById("close-account-modal");
const registerSection = document.getElementById("register-section");
const loginSection = document.getElementById("login-section");
const accountSwitchLinks = document.querySelectorAll(".account-switch a");

if (closeAccountModal && accountModal) {
    closeAccountModal.addEventListener("click", () => {
        accountModal.hidden = true;
    });
}

if (registerSection && loginSection) {
    loginSection.hidden = true;

    accountSwitchLinks.forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();

            if (link.getAttribute("href") === "#login-section") {
                registerSection.hidden = true;
                loginSection.hidden = false;
            } else if (link.getAttribute("href") === "#register-section") {
                loginSection.hidden = true;
                registerSection.hidden = false;
            }
        });
    });
}
// ===== ADD PRODUCT MODAL =====          

const addProductButton = document.getElementById("add-product-button");
const addProductModal = document.getElementById("add-product-modal");
const closeAddProductModal = document.getElementById("close-add-product-modal");

if (addProductButton && addProductModal && closeAddProductModal) {

    addProductButton.addEventListener("click", () => {
        const addProductContent = document.getElementById("add-product-content");

        if (addProductContent) {
            addProductContent.hidden = false;
        }

        addProductModal.hidden = false;
    });

    closeAddProductModal.addEventListener("click", () => {
        addProductModal.hidden = true;
    });

    addProductModal.addEventListener("click", (event) => {
        if (event.target === addProductModal) {
            addProductModal.hidden = true;
        }
    });
}


function displayRecommendedProducts(referenceProduct = null) {
    const recommendedList = getElement("recommended-list");
    if (!recommendedList) return;

    recommendedList.replaceChildren();

    if (!allProducts || allProducts.length < 2) {
        recommendedList.textContent =
            "Add more products to see recommendations.";
        return;
    }

    const searchText = searchInput.value.trim().toLowerCase();
    const selectedSize = sizeFilter.value;
    const selectedColor = colorFilter.value.toLowerCase();
    const selectedStyle = styleFilter.value.toLowerCase();
    const minPrice = minPriceFilter.value;
    const maxPrice = maxPriceFilter.value;

    // Check which products match the current filters.
    const matchingProducts = allProducts.filter(product => {
        const name = (product.product_name || "").toLowerCase();
        const description = (product.description || "").toLowerCase();
        const color = (product.color || "").toLowerCase();
        const style = (product.style || "").toLowerCase();
        const price = Number(product.price);

        const matchesSearch =
            !searchText ||
            name.includes(searchText) ||
            description.includes(searchText) ||
            color.includes(searchText) ||
            style.includes(searchText);

        return matchesSearch &&
            (!selectedSize || product.size === selectedSize) &&
            (!selectedColor || color === selectedColor) &&
            (!selectedStyle || style === selectedStyle) &&
            (!minPrice || price >= Number(minPrice)) &&
            (!maxPrice || price <= Number(maxPrice));
    });

    // Keep the viewed product as the reference when possible.
    if (
        !referenceProduct ||
        !allProducts.some(product => product.id === referenceProduct.id)
    ) {
        referenceProduct =
            matchingProducts[0] ||
            allProducts.find(product =>
                (product.availability || "Available") === "Available"
            ) ||
            allProducts[0];
    }

    // Only recommend available products, excluding the reference item.
    const availableProducts = allProducts.filter(product =>
        product.id !== referenceProduct.id &&
        (product.availability || "Available") === "Available"
    );

    // Score products by similarity to the reference product.
    function getSimilarityScore(product) {
        let score = 0;

        if (
            product.style &&
            referenceProduct.style &&
            product.style.toLowerCase() ===
                referenceProduct.style.toLowerCase()
        ) {
            score += 2;
        }

        if (
            product.color &&
            referenceProduct.color &&
            product.color.toLowerCase() ===
                referenceProduct.color.toLowerCase()
        ) {
            score += 1;
        }

        if (
            product.size &&
            referenceProduct.size &&
            product.size.toLowerCase() ===
                referenceProduct.size.toLowerCase()
        ) {
            score += 1;
        }

        const priceDifference = Math.abs(
            Number(product.price) - Number(referenceProduct.price)
        );

        if (priceDifference <= 50) {
            score += 1;
        }

        return score;
    }

    // Show matching products first, ranked by similarity.
    const matchingRecommendations = availableProducts
        .filter(product =>
            matchingProducts.some(match => match.id === product.id)
        )
        .map(product => ({
            product,
            score: getSimilarityScore(product)
        }))
        .sort((a, b) => b.score - a.score)
        .map(item => item.product);

    // Fill any remaining spaces with other available products.
    const fallbackRecommendations = availableProducts
        .filter(product =>
            !matchingRecommendations.some(
                match => match.id === product.id
            )
        )
        .map(product => ({
            product,
            score: getSimilarityScore(product)
        }))
        .sort((a, b) => b.score - a.score)
        .map(item => item.product);

    const recommendedProducts = [
        ...matchingRecommendations,
        ...fallbackRecommendations
    ].slice(0, 4);

    if (recommendedProducts.length === 0) {
        recommendedList.textContent =
            "More thrift finds coming soon!";
        return;
    }

    displayProducts(recommendedProducts, recommendedList);
}



/* ===== RESET ALL SEARCH AND FILTERS ===== */

const resetFiltersButton = getElement("reset-filters");

if (resetFiltersButton) {
    resetFiltersButton.addEventListener("click", () => {
        getElement("search-input").value = "";
        getElement("size-filter").value = "";
        getElement("color-filter").value = "";
        getElement("style-filter").value = "";
        getElement("min-price").value = "";
        getElement("max-price").value = "";

        loadProducts();
    });
}


/* ===== ADMIN LOGIN ===== */

const adminLoginForm = document.getElementById("admin-login-form");

if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const emailInput = document.getElementById("admin-email");
        const passwordInput = document.getElementById("admin-password");
        const message = document.getElementById("admin-login-message");
        const button = adminLoginForm.querySelector('button[type="submit"]');

        message.textContent = "Logging in...";
        button.disabled = true;

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: emailInput.value.trim(),
                    password: passwordInput.value
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Login failed.");
            }

            if (!result.user || result.user.role !== "admin") {
                throw new Error("Admin access only. Please use an admin account.");
            }

                        // Save the token for this page session.
            window.thriftMatchToken = result.token;
            sessionStorage.setItem("thriftMatchToken", result.token);
            window.thriftMatchUserId = result.user.id;

            message.textContent = "Admin login successful!";

            // Redirect to the admin dashboard.
            window.location.href = "/admin-dashboard.html";
            // The admin dashboard will be added in a later step.
        } catch (error) {
            message.textContent = error.message || "Unable to log in.";
        } finally {
            button.disabled = false;
        }
    });
}

/* ===== ADMIN PASSWORD SHOW / HIDE ===== */

const adminPasswordInput = document.getElementById("admin-password");
const toggleAdminPassword = document.getElementById("toggle-admin-password");
const passwordEyeIcon = document.getElementById("password-eye-icon");

if (adminPasswordInput && toggleAdminPassword) {
    toggleAdminPassword.addEventListener("click", function () {

        if (adminPasswordInput.type === "password") {
            adminPasswordInput.type = "text";
            toggleAdminPassword.setAttribute("aria-label", "Hide password");
            toggleAdminPassword.setAttribute("aria-pressed", "true");

            passwordEyeIcon.innerHTML = `
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/>
                <path d="M3 3l18 18"/>
            `;
        } else {
            adminPasswordInput.type = "password";
            toggleAdminPassword.setAttribute("aria-label", "Show password");
            toggleAdminPassword.setAttribute("aria-pressed", "false");

            passwordEyeIcon.innerHTML = `
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/>
                <circle cx="12" cy="12" r="3"/>
            `;
        }

    });
}

/* ===== EXTERNAL PRODUCTS API ===== */

async function loadExternalProducts() {
    const productList = document.getElementById("external-product-list");

    if (!productList) return;

    productList.innerHTML = "<p>Loading external products...</p>";

    try {
        const response = await fetch("/api/external-products");
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to load external products.");
        }

        if (!result.products || result.products.length === 0) {
            productList.innerHTML = "<p>No external products available.</p>";
            return;
        }

        productList.innerHTML = result.products.map(product => `
            <div class="external-product-card">
                <img
                    src="${product.thumbnail}"
                    alt="${product.title}"
                >

                <h3>${product.title}</h3>

                <p>${product.description}</p>

                <p class="external-product-price">
                    $${Number(product.price).toFixed(2)}
                </p>

                <p>Rating: ${product.rating} / 5</p>
            </div>
        `).join("");

    } catch (error) {
        console.error("External products error:", error);

        productList.innerHTML =
            "<p>Unable to load external products.</p>";
    }
}

// Load external products when the page opens.
loadExternalProducts();

/* ===== MANAGE MY PRODUCTS MODAL WITH PAGINATION ===== */

const manageProductsButton = getElement("manage-products-button");
const manageProductsModal = getElement("manage-products-modal");
const closeManageProductsButton = getElement("close-manage-products");

const myProductList = getElement("my-product-list");
const pagination = getElement("my-products-pagination");
const prevPageButton = getElement("my-products-prev");
const nextPageButton = getElement("my-products-next");
const pageInfo = getElement("my-products-page-info");

const productsPerPage = 10;

let sellerProducts = [];
let currentSellerPage = 1;

function displaySellerProductsPage() {
    if (!myProductList) return;

    const totalPages = Math.ceil(
        sellerProducts.length / productsPerPage
    );

    const startIndex =
        (currentSellerPage - 1) * productsPerPage;

    const currentProducts = sellerProducts.slice(
        startIndex,
        startIndex + productsPerPage
    );

    displayProducts(currentProducts, myProductList);

    if (pagination) {
        pagination.hidden = totalPages <= 1;
    }

    if (pageInfo) {
        pageInfo.textContent =
            `Page ${currentSellerPage} of ${totalPages}`;
    }

    if (prevPageButton) {
        prevPageButton.disabled = currentSellerPage === 1;
    }

    if (nextPageButton) {
        nextPageButton.disabled =
            currentSellerPage >= totalPages;
    }
}

// Open modal
if (manageProductsButton && manageProductsModal) {
    manageProductsButton.addEventListener("click", () => {

        sellerProducts = allProducts.filter(product =>
            Number(product.user_id) === Number(window.thriftMatchUserId)
        );

        currentSellerPage = 1;

        displaySellerProductsPage();

        manageProductsModal.hidden = false;
    });
}

// Previous page
if (prevPageButton) {
    prevPageButton.addEventListener("click", () => {
        if (currentSellerPage > 1) {
            currentSellerPage--;
            displaySellerProductsPage();
        }
    });
}

// Next page
if (nextPageButton) {
    nextPageButton.addEventListener("click", () => {
        const totalPages = Math.ceil(
            sellerProducts.length / productsPerPage
        );

        if (currentSellerPage < totalPages) {
            currentSellerPage++;
            displaySellerProductsPage();
        }
    });
}

// Close modal using X
if (closeManageProductsButton && manageProductsModal) {
    closeManageProductsButton.addEventListener("click", () => {
        manageProductsModal.hidden = true;
    });
}

// Close modal by clicking outside
if (manageProductsModal) {
    manageProductsModal.addEventListener("click", event => {
        if (event.target === manageProductsModal) {
            manageProductsModal.hidden = true;
        }
    });
}

// ===== THRIFTMATCH HERO CAROUSEL =====

const heroCarousel = document.getElementById("hero-carousel");
const heroPrevButton = document.getElementById("hero-prev");
const heroNextButton = document.getElementById("hero-next");

if (heroCarousel && heroPrevButton && heroNextButton) {

    const heroSlides = [
        {
            image: "images/thrift pic 2.jpg",
            title: "One person's old, your new favorite.",
            subtitle: "Find your next favorite thrift piece."
        },
        {
            image: "images/thrift4.jpg",
            title: "Style That Tells a Story.",
            subtitle: "Discover unique pieces at affordable prices."
        },
        {
            image: "images/vintage-clothing-rack-with-sweaters-and-denim-in-second-hand-thrift-store-photo.jpeg",
            title: "Give Clothes a Second Chance.",
            subtitle: "Thrift more, waste less."
        }
    ];

    let currentHeroSlide = 0;

    function showHeroSlide(index) {
        currentHeroSlide = (index + heroSlides.length) % heroSlides.length;

        const slide = heroSlides[currentHeroSlide];

        heroCarousel.style.backgroundImage =
            `linear-gradient(rgba(68, 53, 45, 0.35), rgba(68, 53, 45, 0.35)), url("${slide.image}")`;

        const title = heroCarousel.querySelector(".hero-slide-content h2");
        const subtitle = heroCarousel.querySelector(".hero-slide-content span");

        if (title) title.textContent = slide.title;
        if (subtitle) subtitle.textContent = slide.subtitle;
    }

    heroPrevButton.addEventListener("click", () => {
        showHeroSlide(currentHeroSlide - 1);
    });

    heroNextButton.addEventListener("click", () => {
        showHeroSlide(currentHeroSlide + 1);
    });

    showHeroSlide(0);
}