import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper from 'react-easy-crop';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from './ui';

function createImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', (err) => reject(err));
        img.setAttribute('crossOrigin', 'anonymous');
        img.src = url;
    });
}

function getRadianAngle(degreeValue) {
    return (degreeValue * Math.PI) / 180;
}

/**
 * Returns a canvas with the image rotated + cropped to the given pixel area.
 */
async function getCroppedBlob(imageSrc, pixelCrop, rotation = 0) {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    // Set canvas to a large enough area to rotate without clipping
    canvas.width = safeArea;
    canvas.height = safeArea;

    // Translate to center, rotate, draw image, translate back
    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate(getRadianAngle(rotation));
    ctx.translate(-safeArea / 2, -safeArea / 2);

    ctx.drawImage(
        image,
        safeArea / 2 - image.width * 0.5,
        safeArea / 2 - image.height * 0.5,
    );

    // Extract the cropped area
    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    // Resize canvas to final crop size
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
        data,
        Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
        Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y),
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('Canvas toBlob failed'));
                    return;
                }
                resolve(blob);
            },
            'image/jpeg',
            0.92,
        );
    });
}

export default function AvatarCropModal({ isOpen, onClose, imageSrc, onCropComplete, uploading = false }) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onCropChange = useCallback((location) => setCrop(location), []);
    const onZoomChange = useCallback((z) => setZoom(z), []);

    const handleCropComplete = useCallback((_croppedArea, croppedPixels) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleSave = async () => {
        if (!croppedAreaPixels || !imageSrc) return;
        try {
            const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, rotation);
            const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
            onCropComplete(file);
        } catch {
            // error handled by parent
        }
    };

    if (!isOpen || !imageSrc) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 12 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border px-5 py-4">
                        <h3 className="text-sm font-semibold text-foreground">Crop Profile Picture</h3>
                        <button
                            onClick={onClose}
                            disabled={uploading}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent/20 hover:text-foreground"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Crop Area */}
                    <div className="relative h-[340px] w-full bg-black">
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            rotation={rotation}
                            aspect={1}
                            cropShape="round"
                            showGrid={false}
                            onCropChange={onCropChange}
                            onZoomChange={onZoomChange}
                            onCropComplete={handleCropComplete}
                        />
                    </div>

                    {/* Controls */}
                    <div className="border-t border-border px-5 py-4">
                        <div className="flex items-center gap-3">
                            <ZoomOut size={16} className="shrink-0 text-muted-foreground" />
                            <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.05}
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="flex-1 accent-primary"
                            />
                            <ZoomIn size={16} className="shrink-0 text-muted-foreground" />

                            <button
                                onClick={() => setRotation((r) => (r + 90) % 360)}
                                className="ml-2 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent/20 hover:text-foreground"
                                title="Rotate 90°"
                            >
                                <RotateCw size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 border-t border-border px-5 py-4">
                        <Button variant="ghost" size="sm" onClick={onClose} disabled={uploading}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={handleSave} loading={uploading}>
                            Save
                        </Button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
