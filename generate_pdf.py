import markdown2
from xhtml2pdf import pisa

def convert_markdown_to_pdf(md_file, pdf_file):
    # Read markdown content
    with open(md_file, 'r', encoding='utf-8') as f:
        md_text = f.read()

    # Convert Markdown to HTML
    # We use some extras to make tables and code blocks look decent
    html_content = markdown2.markdown(md_text, extras=["tables", "fenced-code-blocks"])

    # Basic CSS to make it look like a nice report
    html_template = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @page {{
                size: A4;
                margin: 2cm;
                @frame footer {{
                    -pdf-frame-content: footerContent;
                    bottom: 1cm;
                    margin-left: 2cm;
                    margin-right: 2cm;
                    height: 1cm;
                }}
            }}
            body {{
                font-family: Helvetica, Arial, sans-serif;
                font-size: 11pt;
                line-height: 1.5;
                color: #333333;
            }}
            h1 {{ color: #1a1a1a; font-size: 24pt; border-bottom: 2px solid #8B5CF6; padding-bottom: 5px; }}
            h2 {{ color: #2c3e50; font-size: 18pt; margin-top: 20px; }}
            h3 {{ color: #34495e; font-size: 14pt; }}
            pre {{
                background-color: #f4f4f4;
                padding: 10px;
                font-size: 9pt;
                border: 1px solid #ddd;
                border-radius: 4px;
                white-space: pre-wrap;
                word-wrap: break-word;
            }}
            code {{ font-family: "Courier New", Courier, monospace; background: #f4f4f4; padding: 2px 4px; }}
            hr {{ border: 0; border-top: 1px solid #ddd; margin: 20px 0; }}
            table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
            th, td {{ border: 1px solid #ccc; padding: 8px; text-align: left; }}
            th {{ background-color: #f8f8f8; }}
        </style>
    </head>
    <body>
        <div id="footerContent" style="text-align: right; font-size: 9pt; color: #777;">
            AURORA AI Project Report | Page <pdf:pagenumber>
        </div>
        {html_content}
    </body>
    </html>
    """

    # Generate PDF
    with open(pdf_file, "wb") as output_pdf:
        pisa_status = pisa.CreatePDF(
            src=html_template,
            dest=output_pdf,
            encoding='utf-8'
        )

    if pisa_status.err:
        print("Error generating PDF")
    else:
        print(f"Successfully generated {pdf_file}")

if __name__ == "__main__":
    convert_markdown_to_pdf("Aurora_AI_Project_Report.md", "Aurora_AI_Project_Report.pdf")
