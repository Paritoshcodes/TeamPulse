export function groupMessages(messages) {
    const groups = [];
    for (let i = 0; i < (messages || []).length; i++) {
        const msg = messages[i];
        const prev = messages[i - 1];
        const isSameSender = prev && prev.sender?._id === msg.sender?._id;
        const isWithin5Min =
            prev &&
            (new Date(msg.createdAt) - new Date(prev.createdAt)) < 5 * 60 * 1000;
        const isSameDay =
            prev &&
            new Date(msg.createdAt).toDateString() === new Date(prev.createdAt).toDateString();

        groups.push({
            ...msg,
            isGrouped: isSameSender && isWithin5Min,
            showDateSeparator: !isSameDay,
        });
    }
    return groups;
}
