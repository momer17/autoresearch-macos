#!/bin/bash
git clone https://github.com/momer17/autoresearch-macos.git
cd autoresearch-macos
pip install anthropic
echo "ANTHROPIC_API_KEY=your-new-key-here" > .env
export $(cat .env | grep -v '^#' | xargs)
python -c "
import anthropic, os
client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
r = client.messages.create(model='claude-haiku-4-5', max_tokens=20, messages=[{'role':'user','content':'ping'}])
print('OK:', r.content[0].text)
"
