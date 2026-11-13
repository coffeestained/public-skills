def fill(template, **slots):
    # Each placeholder looks like `/*__NAME__*/{}`; the comment is kept so the file stays re-renderable.
    out = template
    for name, value in slots.items():
        marker = f"/*__{name}__*/"
        start = out.index(marker) + len(marker)
        end = out.index(";", start)  # placeholder value runs to the end of the statement
        data = json.dumps(value).replace("</", "<\\/")  # a "</script>" inside a string must not end the script
        out = out[:start] + data + out[end:]
    return out
