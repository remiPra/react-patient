import { useState } from 'react';

function WhatsAppButton({ 
    phoneNumber, 
    buttonText = "WhatsApp", 
    buttonClassName = "px-4 py-2 text-white bg-green-500 rounded-md hover:bg-green-600",
    defaultMessage = "",
    onMessageSent = () => {} 
}) {
    const [showModal, setShowModal] = useState(false);
    const [message, setMessage] = useState(defaultMessage);

    const handleSend = () => {
        if (!message.trim()) return;
        
        const formattedPhone = phoneNumber.replace(/\D/g, '');
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${formattedPhone}?text=${encodedMessage}`, '_blank');
        setShowModal(false);
        setMessage(defaultMessage);
        onMessageSent();
    };

    // On déplace le Modal en dehors du return pour éviter la recréation à chaque rendu
    const Modal = (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold mb-4">Envoyer un message WhatsApp</h3>
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
                    rows="4"
                    placeholder="Écrivez votre message..."
                />
                <div className="flex justify-end space-x-4">
                    <button
                        onClick={() => {
                            setShowModal(false);
                            setMessage(defaultMessage);
                        }}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSend}
                        className="px-4 py-2 text-white bg-green-500 rounded-md hover:bg-green-600"
                        disabled={!message.trim()}
                    >
                        Envoyer
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className={buttonClassName}
            >
                {buttonText}
            </button>
            {showModal && Modal}
        </>
    );
}

export default WhatsAppButton;