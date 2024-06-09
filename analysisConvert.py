def replace_newline(text):
    return text.replace('\n', '\\n')

def add_newline(text):
    return text.replace('\\n', '\n')

def main():
    file_path = input("Enter the path to the text file: ")

    try:
        with open(file_path, 'r') as file:
            text = file.read()
    except FileNotFoundError:
        print("File not found.")
        return

    choice = input("Choose an option (1 for replace '\\n' with newlines, 2 for replace newlines with '\\n'): ")

    if choice == '1':
        result = replace_newline(text)
    elif choice == '2':
        result = add_newline(text)
    else:
        print("Invalid choice.")
        return

    try:
        with open(file_path, 'w') as file:
            file.write(result)
        print("Output saved to", file_path)
    except Exception as e:
        print("Error occurred while writing to file:", str(e))

if __name__ == "__main__":
    main()
