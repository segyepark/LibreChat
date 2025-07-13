import { useContext, useState } from 'react';
import { AuthContext } from '../../hooks/AuthContext';
import { SystemRoles } from 'librechat-data-provider';

const FileUpload = () => {
    const authContext = useContext(AuthContext);
    const user = authContext?.user;
    const isAdmin = user?.role === SystemRoles.ADMIN;
    const [isGlobal, setIsGlobal] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        if (isAdmin && isGlobal) {
            formData.append('isGlobal', 'true');
        }

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            if (response.ok) {
                alert('File uploaded successfully!');
                // Optionally, refresh the file list
            } else {
                alert('Failed to upload file.');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('An error occurred during file upload.');
        }
    };

    return (
        <div>
            <h2>Upload New File</h2>
            <input type="file" onChange={handleFileUpload} />
            {isAdmin && (
                <label style={{ display: 'block', marginTop: 8 }}>
                    <input
                        type="checkbox"
                        checked={isGlobal}
                        onChange={e => setIsGlobal(e.target.checked)}
                        style={{ marginRight: 4 }}
                    />
                    Make this file global (shared with all users)
                </label>
            )}
        </div>
    );
};

export default FileUpload; 