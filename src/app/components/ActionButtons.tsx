"use client";

import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

interface ActionButtonsProps {
    onEdit?: () => void;
    onDelete?: () => void;
    showEdit?: boolean;
    showDelete?: boolean;
    editLabel?: string;
    deleteLabel?: string;
    customActions?: React.ReactNode;
}

export default function ActionButtons({
    onEdit,
    onDelete,
    showEdit = true,
    showDelete = true,
    editLabel = "Modifier",
    deleteLabel = "Supprimer",
    customActions,
}: ActionButtonsProps) {
    return (
        <div className="flex gap-2">
            {customActions}
            {showEdit && onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                    <Edit className="mr-1 h-3 w-3" />
                    {editLabel}
                </Button>
            )}
            {showDelete && onDelete && (
                <Button variant="destructive" size="sm" onClick={onDelete}>
                    <Trash2 className="mr-1 h-3 w-3" />
                    {deleteLabel}
                </Button>
            )}
        </div>
    );
}
