import re
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple

@dataclass
class Section:
    """Represents a section in a markdown document."""
    level: int
    title: str
    content: str
    start_pos: int
    end_pos: int
    subsections: List['Section']

class DocumentStructure:
    """Manages markdown document structure and section access."""
    
    def __init__(self):
        self.sections: List[Section] = []
        self.toc: Dict[str, Section] = {}
        
    def parse_document(self, content: str) -> None:
        """Parse markdown content into sections."""
        self.sections = []
        self.toc = {}
        
        # Find all headers with their positions
        header_pattern = re.compile(r'^(#{1,6})\s+(.+)$', re.MULTILINE)
        headers = [(match.group(1), match.group(2), match.start(), match.end()) 
                  for match in header_pattern.finditer(content)]
        
        if not headers:
            # If no headers, treat entire document as one section
            self.sections = [Section(
                level=0,
                title="Document",
                content=content,
                start_pos=0,
                end_pos=len(content),
                subsections=[]
            )]
            return
            
        # Process headers into sections
        current_sections = []
        for i, (hashes, title, start, header_end) in enumerate(headers):
            level = len(hashes)
            
            # Find section content (from end of this header to start of next, or end of document)
            content_start = header_end
            content_end = headers[i + 1][2] if i < len(headers) - 1 else len(content)
            section_content = content[content_start:content_end].strip()
            
            section = Section(
                level=level,
                title=title.strip(),
                content=section_content,
                start_pos=start,
                end_pos=content_end,
                subsections=[]
            )
            
            # Add to table of contents
            section_id = self._make_section_id(title)
            self.toc[section_id] = section
            
            # Find parent section by checking levels
            while current_sections and current_sections[-1].level >= level:
                current_sections.pop()
                
            if current_sections:
                current_sections[-1].subsections.append(section)
            else:
                self.sections.append(section)
                
            current_sections.append(section)
    
    def get_section_by_id(self, section_id: str) -> Optional[Section]:
        """Get a section by its ID."""
        return self.toc.get(section_id)
    
    def get_table_of_contents(self) -> List[Tuple[int, str, str]]:
        """Get table of contents as [(level, title, section_id)]."""
        toc_entries = []
        
        def add_section(section: Section, prefix: str = ""):
            section_id = self._make_section_id(section.title)
            toc_entries.append((section.level, prefix + section.title, section_id))
            for subsection in section.subsections:
                add_section(subsection, prefix + "  ")
        
        for section in self.sections:
            add_section(section)
            
        return toc_entries
    
    def _make_section_id(self, title: str) -> str:
        """Generate a URL-friendly section ID from title."""
        # Convert to lowercase and replace spaces with hyphens
        section_id = title.lower().replace(" ", "-")
        # Remove any non-alphanumeric characters (except hyphens)
        section_id = re.sub(r'[^a-z0-9-]', '', section_id)
        # Remove multiple consecutive hyphens
        section_id = re.sub(r'-+', '-', section_id)
        return section_id.strip('-')