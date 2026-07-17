import { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Box, IconButton, Popover, ToggleButton, ToggleButtonGroup } from "@mui/material";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import LinkIcon from "@mui/icons-material/Link";
import InsertEmoticonIcon from "@mui/icons-material/InsertEmoticon";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false })],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  function toggleLink() {
    const url = window.prompt("Link URL");
    if (url) editor!.chain().focus().setLink({ href: url }).run();
  }

  function handleEmojiClick(data: EmojiClickData) {
    editor!.chain().focus().insertContent(data.emoji).run();
    setEmojiAnchor(null);
  }

  const activeFormats = [
    editor.isActive("bold") && "bold",
    editor.isActive("italic") && "italic",
    editor.isActive("bulletList") && "bulletList",
    editor.isActive("orderedList") && "orderedList",
  ].filter(Boolean) as string[];

  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          p: 0.5,
        }}
      >
        <ToggleButtonGroup size="small" value={activeFormats} onChange={() => {}}>
          <ToggleButton value="bold" aria-label="Bold" onClick={() => editor.chain().focus().toggleBold().run()}>
            <FormatBoldIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton
            value="italic"
            aria-label="Italic"
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <FormatItalicIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton
            value="bulletList"
            aria-label="Bulleted list"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <FormatListBulletedIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton
            value="orderedList"
            aria-label="Numbered list"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <FormatListNumberedIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
        <IconButton size="small" onClick={toggleLink} aria-label="Insert link">
          <LinkIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={(e) => setEmojiAnchor(e.currentTarget)} aria-label="Insert emoji">
          <InsertEmoticonIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ p: 1.5, minHeight: 120, "& .ProseMirror": { outline: "none" } }}>
        <EditorContent editor={editor} />
      </Box>
      <Popover
        open={Boolean(emojiAnchor)}
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <EmojiPicker onEmojiClick={handleEmojiClick} />
      </Popover>
    </Box>
  );
}
